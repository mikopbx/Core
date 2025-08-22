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
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9._-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores'
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
            value: '/^[a-zA-Z0-9._-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores'
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

_defineProperty(ProviderSIP, "SIP_SELECTORS", {
  ADDITIONAL_HOSTS_TABLE: '#additional-hosts-table',
  ADDITIONAL_HOSTS_DUMMY: '#additional-hosts-table .dummy',
  ADDITIONAL_HOSTS_TEMPLATE: '#additional-hosts-table .host-row-tpl',
  ADDITIONAL_HOST_INPUT: '#additional-host input',
  DELETE_ROW_BUTTON: '.delete-row-button',
  HOST_ROW: '.host-row'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGZpZWxkIiwibGVuZ3RoIiwiJGV4aXN0aW5nRHJvcGRvd24iLCJoYXNDbGFzcyIsImRyb3Bkb3duIiwiY3VycmVudFZhbHVlIiwidmFsIiwiUHJvdmlkZXJCYXNlIiwiREVGQVVMVFMiLCJEVE1GX01PREUiLCJvcHRpb25zIiwidmFsdWUiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXV0byIsInJmYzQ3MzMiLCJpbmZvIiwiaW5iYW5kIiwiYXV0b19pbmZvIiwiZHJvcGRvd25IdG1sIiwiZmluZCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJUUkFOU1BPUlQiLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwicHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IiwicHJfQ2FsbGVySWRTb3VyY2VGcm9tIiwicHJfQ2FsbGVySWRTb3VyY2VScGlkIiwicHJfQ2FsbGVySWRTb3VyY2VQYWkiLCJwcl9DYWxsZXJJZFNvdXJjZUN1c3RvbSIsIm9uRGlkU291cmNlQ2hhbmdlIiwicHJfRGlkU291cmNlRGVmYXVsdCIsInByX0RpZFNvdXJjZVRvIiwicHJfRGlkU291cmNlRGl2ZXJzaW9uIiwicHJfRGlkU291cmNlQ3VzdG9tIiwiJGN1c3RvbVNldHRpbmdzIiwidHJhbnNpdGlvbiIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiJGZvcm1PYmoiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsImFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCJob3N0IiwidHJpbSIsInB1c2giLCJhZGRyZXNzIiwiZHRtZm1vZGUiLCJ0cmFuc3BvcnQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsImRpc2FibGVmcm9tdXNlciIsInByb3AiLCJxdWFsaWZ5ZnJlcSIsIlFVQUxJRllfRlJFUSIsImNpZF9zb3VyY2UiLCJkaWRfc291cmNlIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3N0YXJ0IiwiY2lkX3BhcnNlcl9lbmQiLCJjaWRfcGFyc2VyX3JlZ2V4IiwiZGlkX2N1c3RvbV9oZWFkZXIiLCJkaWRfcGFyc2VyX3N0YXJ0IiwiZGlkX3BhcnNlcl9lbmQiLCJkaWRfcGFyc2VyX3JlZ2V4IiwiY2lkX2RpZF9kZWJ1ZyIsImRyb3Bkb3duVXBkYXRlcyIsInNlbGVjdG9yIiwicmVnaXN0cmF0aW9uX3R5cGUiLCJSRUdJU1RSQVRJT05fVFlQRSIsImZvckVhY2giLCIkZHJvcGRvd24iLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsInJ1bGVzIiwiYWRkQ2FsbGVySWREaWRSdWxlcyIsImNhbGxlcklkU291cmNlIiwiZGlkU291cmNlIiwiY3VzdG9tSGVhZGVyUnVsZXMiLCJwcm9tcHQiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwicHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQiLCJpZGVudGlmaWVyIiwicmVnZXhWYWxpZGF0aW9uUnVsZSIsIm9wdGlvbmFsIiwiY2FsbGJhY2siLCJSZWdFeHAiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRlc2NyaXB0aW9uIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkaG9zdExhYmVsVGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJvdmlkZXJJZCIsImVsZW1lbnRzIiwiYWRkaXRpb25hbEhvc3QiLCJuZXR3b3JrRmlsdGVyIiwiZmllbGRzIiwiJHNlY3JldCIsIm5ldHdvcmtGaWx0ZXJJZCIsImNvbmZpZ3MiLCJ2aXNpYmxlIiwiaGlkZGVuIiwicGFzc3dvcmRXaWRnZXQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInZhbGlkYXRpb24iLCJQYXNzd29yZFdpZGdldCIsIlZBTElEQVRJT04iLCJOT05FIiwicmVzZXROZXR3b3JrRmlsdGVyIiwiU09GVCIsInJlYWRvbmx5VXNlcm5hbWUiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsImNsZWFyVmFsaWRhdGlvbkZvciIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJtYWtlT3B0aW9uYWwiLCJjb25maWciLCJrZXkiLCJzaG93IiwiaGlkZSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiJGdlbmVyYXRlQnRuIiwidHJpZ2dlciIsInVwZGF0ZUNvbmZpZyIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJmaWVsZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJmb3JtIiwidXBkYXRlSG9zdExhYmVsIiwiZWwiLCJmcm9tVXNlciIsImNpZERyb3Bkb3duIiwiY2lkVmFsdWUiLCJjaWRDdXN0b21TZXR0aW5ncyIsImRpZERyb3Bkb3duIiwiZGlkVmFsdWUiLCJkaWRDdXN0b21TZXR0aW5ncyIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsIiRleGlzdGluZ0hvc3RSb3dzIiwiSE9TVF9ST1ciLCJhZnRlciIsIiRob3N0Um93cyIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRjtBQVVBLHlCQUFjO0FBQUE7O0FBQUE7O0FBQ1YsOEJBQU0sS0FBTjtBQUNBLFVBQUtDLGNBQUwsR0FBc0JDLENBQUMsQ0FBQyxVQUFELENBQXZCO0FBQ0EsVUFBS0Msa0JBQUwsR0FBMEJELENBQUMsQ0FBQyxlQUFELENBQTNCLENBSFUsQ0FLVjs7QUFDQSxVQUFLRSxxQkFBTCxHQUE2QkYsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJDLHNCQUEzQixDQUE5QjtBQUNBLFVBQUtDLHdCQUFMLEdBQWdDTCxDQUFDLENBQUNGLFdBQVcs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aW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuICovXG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIC8vIFNJUC1zcGVjaWZpYyBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0lQX1NFTEVDVE9SUyA9IHtcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19UQUJMRTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19EVU1NWTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEVNUExBVEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuaG9zdC1yb3ctdHBsJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUX0lOUFVUOiAnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcsXG4gICAgICAgIERFTEVURV9ST1dfQlVUVE9OOiAnLmRlbGV0ZS1yb3ctYnV0dG9uJyxcbiAgICAgICAgSE9TVF9ST1c6ICcuaG9zdC1yb3cnXG4gICAgfTtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19EVU1NWSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEVNUExBVEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RBQkxFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dCA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RfSU5QVVQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7IFxuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJkaXNhYmxlZnJvbXVzZXJcIl0nKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnIGNoZWNrYm94IC0gdXNpbmcgcGFyZW50IGNvbnRhaW5lciB3aXRoIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucGFyZW50KCcuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnMC40NScpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJ25vdC1hbGxvd2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2R0bWZtb2RlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuRFRNRl9NT0RFO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdhdXRvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG8gfHwgJ2F1dG8nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncmZjNDczMycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5yZmM0NzMzIHx8ICdyZmM0NzMzJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luZm8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5mbyB8fCAnaW5mbycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJhbmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5iYW5kIHx8ICdpbmJhbmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnYXV0b19pbmZvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG9faW5mbyB8fCAnYXV0b19pbmZvJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIGR0bWYtbW9kZS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImR0bWZtb2RlXCIgaWQ9XCJkdG1mbW9kZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj4ke29wdC50ZXh0fTwvZGl2PmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgICQoJy5kdG1mLW1vZGUtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3RyYW5zcG9ydCcpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbnNpZGUgYSBkcm9wZG93biBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IGEgZHJvcGRvd24sIGp1c3QgZW5zdXJlIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJGV4aXN0aW5nRHJvcGRvd24uaGFzQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlRSQU5TUE9SVDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnVURQJywgdGV4dDogJ1VEUCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdUQ1AnLCB0ZXh0OiAnVENQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RMUycsIHRleHQ6ICdUTFMnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gdHJhbnNwb3J0LWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwidHJhbnNwb3J0XCIgaWQ9XCJ0cmFuc3BvcnRcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLnRyYW5zcG9ydC1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNjaWRfc291cmNlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnZGVmYXVsdCc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2RlZmF1bHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IHx8ICdEZWZhdWx0JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2Zyb20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VGcm9tIHx8ICdGUk9NIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdycGlkJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlUnBpZCB8fCAnUmVtb3RlLVBhcnR5LUlEJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3BhaScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVBhaSB8fCAnUC1Bc3NlcnRlZC1JZGVudGl0eScgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdjdXN0b20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VDdXN0b20gfHwgJ0N1c3RvbSBoZWFkZXInIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiY2lkX3NvdXJjZVwiIGlkPVwiY2lkX3NvdXJjZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPiR7b3B0LnRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7b3B0LnZhbHVlID09PSAnY3VzdG9tJyA/ICc8aSBjbGFzcz1cInNldHRpbmdzIGljb24gcmlnaHQgZmxvYXRlZFwiPjwvaT4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLmNhbGxlcmlkLXNvdXJjZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIHNvdXJjZSBkcm9wZG93blxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2RpZF9zb3VyY2UnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdkaWQtc291cmNlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZGlkLXNvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdkZWZhdWx0JztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnZGVmYXVsdCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VEZWZhdWx0IHx8ICdEZWZhdWx0JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3RvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvIHx8ICdUTyBoZWFkZXInIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZGl2ZXJzaW9uJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZURpdmVyc2lvbiB8fCAnRGl2ZXJzaW9uIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdjdXN0b20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlQ3VzdG9tIHx8ICdDdXN0b20gaGVhZGVyJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIGRpZC1zb3VyY2UtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaWRfc291cmNlXCIgaWQ9XCJkaWRfc291cmNlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtvcHQudGV4dH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtvcHQudmFsdWUgPT09ICdjdXN0b20nID8gJzxpIGNsYXNzPVwic2V0dGluZ3MgaWNvbiByaWdodCBmbG9hdGVkXCI+PC9pPicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcuZGlkLXNvdXJjZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQ2FsbGVySUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIENhbGxlcklEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2NhbGxlcmlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0aGlzLmlzTmV3UHJvdmlkZXIgPyAnUE9TVCcgOiAnUFVUJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlzaXAvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlc1xuICAgICAgICAvLyBKdXN0IGFkZC9tb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgYWRkaXRpb25hbCBob3N0cyBmb3IgU0lQIC0gY29sbGVjdCBmcm9tIHRhYmxlXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0ci5ob3N0LXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gJChlbGVtZW50KS5maW5kKCd0ZC5hZGRyZXNzJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzLnB1c2goeyBhZGRyZXNzOiBob3N0IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgYWRkIGlmIHRoZXJlIGFyZSBob3N0c1xuICAgICAgICBpZiAoYWRkaXRpb25hbEhvc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IGFkZGl0aW9uYWxIb3N0cztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgcG9wdWxhdGVGb3JtRGF0YSB0byBoYW5kbGUgU0lQLXNwZWNpZmljIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgbWV0aG9kIGZpcnN0IGZvciBjb21tb24gZmllbGRzXG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgICAgICAkKCcjZHRtZm1vZGUnKS52YWwoZGF0YS5kdG1mbW9kZSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuRFRNRl9NT0RFKTtcbiAgICAgICAgICAgICQoJyN0cmFuc3BvcnQnKS52YWwoZGF0YS50cmFuc3BvcnQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlRSQU5TUE9SVCk7XG4gICAgICAgICAgICAkKCcjZnJvbXVzZXInKS52YWwoZGF0YS5mcm9tdXNlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZnJvbWRvbWFpbicpLnZhbChkYXRhLmZyb21kb21haW4gfHwgJycpO1xuICAgICAgICAgICAgJCgnI291dGJvdW5kX3Byb3h5JykudmFsKGRhdGEub3V0Ym91bmRfcHJveHkgfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTSVAtc3BlY2lmaWMgY2hlY2tib3hlc1xuICAgICAgICAgICAgaWYgKGRhdGEuZGlzYWJsZWZyb211c2VyID09PSAnMScgfHwgZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09IHRydWUpICQoJyNkaXNhYmxlZnJvbXVzZXInKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFF1YWxpZnkgZnJlcXVlbmN5XG4gICAgICAgICAgICAkKCcjcXVhbGlmeWZyZXEnKS52YWwoZGF0YS5xdWFsaWZ5ZnJlcSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuUVVBTElGWV9GUkVRKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbGVySUQvRElEIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2NpZF9zb3VyY2UnKS52YWwoZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAkKCcjZGlkX3NvdXJjZScpLnZhbChkYXRhLmRpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbChkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuZGlkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuZGlkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjaWRfZGlkX2RlYnVnIGNoZWNrYm94XG4gICAgICAgICAgICBpZiAoZGF0YS5jaWRfZGlkX2RlYnVnID09PSAnMScgfHwgZGF0YS5jaWRfZGlkX2RlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHZhbHVlcyBhZnRlciBzZXR0aW5nIGhpZGRlbiBpbnB1dHNcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVXBkYXRlcyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLmR0bWYtbW9kZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmR0bWZtb2RlIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5EVE1GX01PREUgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLnRyYW5zcG9ydC1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnRyYW5zcG9ydCB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuVFJBTlNQT1JUIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy5yZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5SRUdJU1RSQVRJT05fVFlQRSB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcuY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuY2lkX3NvdXJjZSB8fCAnZGVmYXVsdCcgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLmRpZC1zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0JyB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkcm9wZG93blVwZGF0ZXMuZm9yRWFjaCgoeyBzZWxlY3RvciwgdmFsdWUgfSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0cyAtIHBvcHVsYXRlIGFmdGVyIGZvcm0gaXMgcmVhZHlcbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoZGF0YS5hZGRpdGlvbmFsSG9zdHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBzdXBlci5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pZCAmJiAhJCgnI2lkJykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjaWQnKS52YWwocmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoZSBGb3JtLmpzIHdpbGwgaGFuZGxlIHRoZSByZWxvYWQgYXV0b21hdGljYWxseSBpZiByZXNwb25zZS5yZWxvYWQgaXMgcHJlc2VudFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBSRVNUIEFQSSByZXR1cm5zIHJlbG9hZCBwYXRoIGxpa2UgXCJwcm92aWRlcnMvbW9kaWZ5c2lwL1NJUC1UUlVOSy14eHhcIlxuICAgICAgICB9XG4gICAgfVxuICAgIFxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlc01hcCA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiAoKSA9PiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIGluYm91bmQ6ICgpID0+IHRoaXMuZ2V0SW5ib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBub25lOiAoKSA9PiB0aGlzLmdldE5vbmVSdWxlcygpLFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSBydWxlc01hcFtyZWdUeXBlXSA/IHJ1bGVzTWFwW3JlZ1R5cGVdKCkgOiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJ1bGVzIC0gRXhpc3RpbmcgcnVsZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBSdWxlcyB3aXRoIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcykge1xuICAgICAgICBjb25zdCBjYWxsZXJJZFNvdXJjZSA9ICQoJyNjaWRfc291cmNlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGRpZFNvdXJjZSA9ICQoJyNkaWRfc291cmNlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VzdG9tIGhlYWRlciB2YWxpZGF0aW9uIHdoZW4gY3VzdG9tIHNvdXJjZSBpcyBzZWxlY3RlZFxuICAgICAgICBjb25zdCBjdXN0b21IZWFkZXJSdWxlcyA9IHtcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSB8fCAnUGxlYXNlIHNwZWNpZnkgY3VzdG9tIGhlYWRlciBuYW1lJyxcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW0EtWmEtejAtOS1fXSskL10nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRm9ybWF0IHx8ICdIZWFkZXIgbmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRhc2ggYW5kIHVuZGVyc2NvcmUnLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWxsZXJJZFNvdXJjZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHJ1bGVzLmNpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICAgICAgLi4uY3VzdG9tSGVhZGVyUnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChkaWRTb3VyY2UgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBydWxlcy5kaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgICAgIC4uLmN1c3RvbUhlYWRlclJ1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWdleCB2YWxpZGF0aW9uIGlmIHByb3ZpZGVkIChvcHRpb25hbCBmaWVsZHMpXG4gICAgICAgIGNvbnN0IHJlZ2V4VmFsaWRhdGlvblJ1bGUgPSB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdjYWxsYmFjaycsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBSZWdFeHAodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVJbnZhbGlkUmVnZXggfHwgJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uJyxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoKSkge1xuICAgICAgICAgICAgcnVsZXMuY2lkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICAgICAgLi4ucmVnZXhWYWxpZGF0aW9uUnVsZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKCkpIHtcbiAgICAgICAgICAgIHJ1bGVzLmRpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgICAgIC4uLnJlZ2V4VmFsaWRhdGlvblJ1bGVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS5fLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cywgaHlwaGVucyBhbmQgdW5kZXJzY29yZXMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdVc2VybmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMgYW5kIHN5bWJvbHM6IF8gLSAuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLi1dKyQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyB8fCAnVXNlcm5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzIGFuZCBzeW1ib2xzOiBfIC0gLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Ll8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMgfHwgJ0hvc3QgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCBoeXBoZW5zIGFuZCB1bmRlcnNjb3JlcycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjZWxIb3N0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjZWxQb3J0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI2VsVXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI2VsU2VjcmV0JyksXG4gICAgICAgICAgICBhZGRpdGlvbmFsSG9zdDogJCgnI2VsQWRkaXRpb25hbEhvc3RzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcklkOiAkKCcjbmV0d29ya2ZpbHRlcmlkJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uTk9ORVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVzZXROZXR3b3JrRmlsdGVyOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsndXNlcm5hbWUnLCAnc2VjcmV0JywgJ25ldHdvcmtGaWx0ZXInLCAnYWRkaXRpb25hbEhvc3QnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsnaG9zdCcsICdwb3J0J11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0JywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgbWFrZU9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGNsZWFyVmFsaWRhdGlvbkZvcjogWyd1c2VybmFtZScsICdzZWNyZXQnXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBmaWVsZFxuICAgICAgICBpZiAoY29uZmlnLnJlYWRvbmx5VXNlcm5hbWUpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBpZiBpdCBtYXRjaGVzIHByb3ZpZGVyIElEIHdoZW4gbm90IGluYm91bmRcbiAgICAgICAgICAgIGlmIChmaWVsZHMudXNlcm5hbWUudmFsKCkgPT09IHByb3ZpZGVySWQgJiYgcmVnVHlwZSAhPT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVzZXQgbmV0d29yayBmaWx0ZXIgZm9yIG91dGJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVzZXROZXR3b3JrRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWVsZHMubmV0d29ya0ZpbHRlcklkLnZhbCgnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIGZpZWxkcyBvcHRpb25hbFxuICAgICAgICBjb25maWcubWFrZU9wdGlvbmFsPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgICQoYCNlbCR7ZmllbGQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWVsZC5zbGljZSgxKX1gKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3Igc3BlY2lmaWVkIGZpZWxkc1xuICAgICAgICBjb25maWcuY2xlYXJWYWxpZGF0aW9uRm9yPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpOyBcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIENhbGxlcklEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgY2lkRHJvcGRvd24gPSAkKCcuY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChjaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBjaWRWYWx1ZSA9IGNpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGNpZEN1c3RvbVNldHRpbmdzID0gJCgnI2NhbGxlcmlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGNpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgRElEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgZGlkRHJvcGRvd24gPSAkKCcuZGlkLXNvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoZGlkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZGlkVmFsdWUgPSBkaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBkaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNkaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoZGlkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvbXBsZXRpb24gb2YgaG9zdCBhZGRyZXNzIGlucHV0XG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWRkaXRpb25hbC1ob3N0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWx1ZS5tYXRjaCh0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgaW5wdXQgdmFsdWVcbiAgICAgICAgICAgIGlmICh2YWxpZGF0aW9uID09PSBudWxsIHx8IHZhbGlkYXRpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGhvc3QgYWRkcmVzcyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCQoYC5ob3N0LXJvd1tkYXRhLXZhbHVlPVxcXCIke3ZhbHVlfVxcXCJdYCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZShmYWxzZSk7IC8vIFVzZSBmYWxzZSBzaW5jZSBldmVudHMgYXJlIGRlbGVnYXRlZFxuICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnaG9zdC1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5hdHRyKCdkYXRhLXZhbHVlJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5maW5kKCcuYWRkcmVzcycpLmh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRleGlzdGluZ0hvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICAgICAgICAgIGlmICgkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC52YWwoJycpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGhvc3RzIHRhYmxlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdHNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0ICRob3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgaWYgKCRob3N0Um93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBhZGRpdGlvbmFsSG9zdHMgLSBBcnJheSBvZiBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgIGlmICghYWRkaXRpb25hbEhvc3RzIHx8ICFBcnJheS5pc0FycmF5KGFkZGl0aW9uYWxIb3N0cykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgaG9zdHMgZmlyc3QgKGV4Y2VwdCB0ZW1wbGF0ZSBhbmQgZHVtbXkpXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLmZpbmQoYHRib2R5IHRyJHtQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XfWApLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVhY2ggaG9zdCB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICBhZGRpdGlvbmFsSG9zdHMuZm9yRWFjaCgoaG9zdE9iaikgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggb2JqZWN0IGZvcm1hdCB7aWQsIGFkZHJlc3N9IGFuZCBzdHJpbmcgZm9ybWF0XG4gICAgICAgICAgICBjb25zdCBob3N0QWRkcmVzcyA9IHR5cGVvZiBob3N0T2JqID09PSAnc3RyaW5nJyA/IGhvc3RPYmogOiBob3N0T2JqLmFkZHJlc3M7XG4gICAgICAgICAgICBpZiAoaG9zdEFkZHJlc3MgJiYgaG9zdEFkZHJlc3MudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZShmYWxzZSk7IC8vIFVzZSBmYWxzZSBzaW5jZSBldmVudHMgYXJlIGRlbGVnYXRlZFxuICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnaG9zdC1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5hdHRyKCdkYXRhLXZhbHVlJywgaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5maW5kKCcuYWRkcmVzcycpLmh0bWwoaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB0aGUgY2xvbmVkIHJvd1xuICAgICAgICAgICAgICAgIGNvbnN0ICRleGlzdGluZ0hvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICAgICAgICAgIGlmICgkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxufSJdfQ==