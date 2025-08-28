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
      var dropdownHtml = "\n            <div class=\"ui selection dropdown callerid-source-dropdown\" id=\"cid_source-dropdown\">\n                <input type=\"hidden\" name=\"cid_source\" id=\"cid_source\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find2 = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find2 === void 0 ? void 0 : _options$find2.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "\n                        <div class=\"item\" data-value=\"".concat(opt.value, "\">\n                            <span>").concat(opt.text, "</span>\n                            ").concat(opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : '', "\n                        </div>\n                    ");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('#cid_source-dropdown').dropdown({
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
      var dropdownHtml = "\n            <div class=\"ui selection dropdown did-source-dropdown\" id='did_source-dropdown'>\n                <input type=\"hidden\" name=\"did_source\" id=\"did_source\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find3 = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find3 === void 0 ? void 0 : _options$find3.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "\n                        <div class=\"item\" data-value=\"".concat(opt.value, "\">\n                            <span>").concat(opt.text, "</span>\n                            ").concat(opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : '', "\n                        </div>\n                    ");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('#did_source-dropdown').dropdown({
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGZpZWxkIiwibGVuZ3RoIiwiJGV4aXN0aW5nRHJvcGRvd24iLCJoYXNDbGFzcyIsImRyb3Bkb3duIiwiY3VycmVudFZhbHVlIiwidmFsIiwiUHJvdmlkZXJCYXNlIiwiREVGQVVMVFMiLCJEVE1GX01PREUiLCJvcHRpb25zIiwidmFsdWUiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXV0byIsInJmYzQ3MzMiLCJpbmZvIiwiaW5iYW5kIiwiYXV0b19pbmZvIiwiZHJvcGRvd25IdG1sIiwiZmluZCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJUUkFOU1BPUlQiLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwicHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IiwicHJfQ2FsbGVySWRTb3VyY2VGcm9tIiwicHJfQ2FsbGVySWRTb3VyY2VScGlkIiwicHJfQ2FsbGVySWRTb3VyY2VQYWkiLCJwcl9DYWxsZXJJZFNvdXJjZUN1c3RvbSIsIm9uRGlkU291cmNlQ2hhbmdlIiwicHJfRGlkU291cmNlRGVmYXVsdCIsInByX0RpZFNvdXJjZVRvIiwicHJfRGlkU291cmNlRGl2ZXJzaW9uIiwicHJfRGlkU291cmNlQ3VzdG9tIiwiJGN1c3RvbVNldHRpbmdzIiwidHJhbnNpdGlvbiIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiJGZvcm1PYmoiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsImFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCJob3N0IiwidHJpbSIsInB1c2giLCJhZGRyZXNzIiwiZHRtZm1vZGUiLCJ0cmFuc3BvcnQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsImRpc2FibGVmcm9tdXNlciIsInByb3AiLCJxdWFsaWZ5ZnJlcSIsIlFVQUxJRllfRlJFUSIsImNpZF9zb3VyY2UiLCJkaWRfc291cmNlIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3N0YXJ0IiwiY2lkX3BhcnNlcl9lbmQiLCJjaWRfcGFyc2VyX3JlZ2V4IiwiZGlkX2N1c3RvbV9oZWFkZXIiLCJkaWRfcGFyc2VyX3N0YXJ0IiwiZGlkX3BhcnNlcl9lbmQiLCJkaWRfcGFyc2VyX3JlZ2V4IiwiY2lkX2RpZF9kZWJ1ZyIsImRyb3Bkb3duVXBkYXRlcyIsInNlbGVjdG9yIiwicmVnaXN0cmF0aW9uX3R5cGUiLCJSRUdJU1RSQVRJT05fVFlQRSIsImZvckVhY2giLCIkZHJvcGRvd24iLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsInJ1bGVzIiwiYWRkQ2FsbGVySWREaWRSdWxlcyIsImNhbGxlcklkU291cmNlIiwiZGlkU291cmNlIiwiY3VzdG9tSGVhZGVyUnVsZXMiLCJwcm9tcHQiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwicHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQiLCJpZGVudGlmaWVyIiwicmVnZXhWYWxpZGF0aW9uUnVsZSIsIm9wdGlvbmFsIiwiY2FsbGJhY2siLCJSZWdFeHAiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRlc2NyaXB0aW9uIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkaG9zdExhYmVsVGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJvdmlkZXJJZCIsImVsZW1lbnRzIiwiYWRkaXRpb25hbEhvc3QiLCJuZXR3b3JrRmlsdGVyIiwiZmllbGRzIiwiJHNlY3JldCIsIm5ldHdvcmtGaWx0ZXJJZCIsImNvbmZpZ3MiLCJ2aXNpYmxlIiwiaGlkZGVuIiwicGFzc3dvcmRXaWRnZXQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInZhbGlkYXRpb24iLCJQYXNzd29yZFdpZGdldCIsIlZBTElEQVRJT04iLCJOT05FIiwicmVzZXROZXR3b3JrRmlsdGVyIiwiU09GVCIsInJlYWRvbmx5VXNlcm5hbWUiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsImNsZWFyVmFsaWRhdGlvbkZvciIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJtYWtlT3B0aW9uYWwiLCJjb25maWciLCJrZXkiLCJzaG93IiwiaGlkZSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiJGdlbmVyYXRlQnRuIiwidHJpZ2dlciIsInVwZGF0ZUNvbmZpZyIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJmaWVsZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJmb3JtIiwidXBkYXRlSG9zdExhYmVsIiwiZWwiLCJmcm9tVXNlciIsImNpZERyb3Bkb3duIiwiY2lkVmFsdWUiLCJjaWRDdXN0b21TZXR0aW5ncyIsImRpZERyb3Bkb3duIiwiZGlkVmFsdWUiLCJkaWRDdXN0b21TZXR0aW5ncyIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsIiRleGlzdGluZ0hvc3RSb3dzIiwiSE9TVF9ST1ciLCJhZnRlciIsIiRob3N0Um93cyIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRjtBQVVBLHlCQUFjO0FBQUE7O0FBQUE7O0FBQ1YsOEJBQU0sS0FBTjtBQUNBLFVBQUtDLGNBQUwsR0FBc0JDLENBQUMsQ0FBQyxVQUFELENBQXZCO0FBQ0EsVUFBS0Msa0JBQUwsR0FBMEJELENBQUMsQ0FBQyxlQUFELENBQTNCLENBSFUsQ0FLVjs7QUFDQSxVQUFLRSxxQkFBTCxHQUE2QkYsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJDLHNCQUEzQixDQUE5QjtBQUNBLFVBQUtDLHdCQUFMLEdBQWdDTCxDQUFDLENBQUNGLFdBQVcs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aW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuICovXG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIC8vIFNJUC1zcGVjaWZpYyBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0lQX1NFTEVDVE9SUyA9IHtcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19UQUJMRTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19EVU1NWTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEVNUExBVEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuaG9zdC1yb3ctdHBsJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUX0lOUFVUOiAnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcsXG4gICAgICAgIERFTEVURV9ST1dfQlVUVE9OOiAnLmRlbGV0ZS1yb3ctYnV0dG9uJyxcbiAgICAgICAgSE9TVF9ST1c6ICcuaG9zdC1yb3cnXG4gICAgfTtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19EVU1NWSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEVNUExBVEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RBQkxFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dCA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RfSU5QVVQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7IFxuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJkaXNhYmxlZnJvbXVzZXJcIl0nKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnIGNoZWNrYm94IC0gdXNpbmcgcGFyZW50IGNvbnRhaW5lciB3aXRoIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucGFyZW50KCcuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnMC40NScpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJ25vdC1hbGxvd2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2R0bWZtb2RlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuRFRNRl9NT0RFO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdhdXRvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG8gfHwgJ2F1dG8nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncmZjNDczMycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5yZmM0NzMzIHx8ICdyZmM0NzMzJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luZm8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5mbyB8fCAnaW5mbycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJhbmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5iYW5kIHx8ICdpbmJhbmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnYXV0b19pbmZvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG9faW5mbyB8fCAnYXV0b19pbmZvJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIGR0bWYtbW9kZS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImR0bWZtb2RlXCIgaWQ9XCJkdG1mbW9kZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj4ke29wdC50ZXh0fTwvZGl2PmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgICQoJy5kdG1mLW1vZGUtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3RyYW5zcG9ydCcpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbnNpZGUgYSBkcm9wZG93biBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IGEgZHJvcGRvd24sIGp1c3QgZW5zdXJlIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJGV4aXN0aW5nRHJvcGRvd24uaGFzQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlRSQU5TUE9SVDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnVURQJywgdGV4dDogJ1VEUCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdUQ1AnLCB0ZXh0OiAnVENQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RMUycsIHRleHQ6ICdUTFMnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gdHJhbnNwb3J0LWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwidHJhbnNwb3J0XCIgaWQ9XCJ0cmFuc3BvcnRcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLnRyYW5zcG9ydC1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNjaWRfc291cmNlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnZGVmYXVsdCc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2RlZmF1bHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IHx8ICdEZWZhdWx0JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2Zyb20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VGcm9tIHx8ICdGUk9NIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdycGlkJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlUnBpZCB8fCAnUmVtb3RlLVBhcnR5LUlEJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3BhaScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVBhaSB8fCAnUC1Bc3NlcnRlZC1JZGVudGl0eScgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdjdXN0b20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VDdXN0b20gfHwgJ0N1c3RvbSBoZWFkZXInIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duXCIgaWQ9XCJjaWRfc291cmNlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiY2lkX3NvdXJjZVwiIGlkPVwiY2lkX3NvdXJjZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPiR7b3B0LnRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7b3B0LnZhbHVlID09PSAnY3VzdG9tJyA/ICc8aSBjbGFzcz1cInNldHRpbmdzIGljb24gcmlnaHQgZmxvYXRlZFwiPjwvaT4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERJRCBzb3VyY2UgZHJvcGRvd25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNkaWRfc291cmNlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnZGlkLXNvdXJjZS1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ2RpZC1zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnZGVmYXVsdCc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2RlZmF1bHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlRGVmYXVsdCB8fCAnRGVmYXVsdCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICd0bycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUbyB8fCAnVE8gaGVhZGVyJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2RpdmVyc2lvbicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VEaXZlcnNpb24gfHwgJ0RpdmVyc2lvbiBoZWFkZXInIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnY3VzdG9tJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZUN1c3RvbSB8fCAnQ3VzdG9tIGhlYWRlcicgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBkaWQtc291cmNlLWRyb3Bkb3duXCIgaWQ9J2RpZF9zb3VyY2UtZHJvcGRvd24nPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpZF9zb3VyY2VcIiBpZD1cImRpZF9zb3VyY2VcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ke29wdC50ZXh0fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke29wdC52YWx1ZSA9PT0gJ2N1c3RvbScgPyAnPGkgY2xhc3M9XCJzZXR0aW5ncyBpY29uIHJpZ2h0IGZsb2F0ZWRcIj48L2k+JyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBDYWxsZXJJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgQ2FsbGVySUQgc291cmNlXG4gICAgICovXG4gICAgb25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIERJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgRElEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNkaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFByb3ZpZGVyc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJyxcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6IHRoaXMuaXNOZXdQcm92aWRlciA/ICdQT1NUJyA6ICdQVVQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeXNpcC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzXG4gICAgICAgIC8vIEp1c3QgYWRkL21vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwcm92aWRlciB0eXBlXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVAgLSBjb2xsZWN0IGZyb20gdGFibGVcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyLmhvc3Qtcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKGVsZW1lbnQpLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7IGFkZHJlc3M6IGhvc3QgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3QgZm9yIGNvbW1vbiBmaWVsZHNcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgICAgICQoJyNkdG1mbW9kZScpLnZhbChkYXRhLmR0bWZtb2RlIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5EVE1GX01PREUpO1xuICAgICAgICAgICAgJCgnI3RyYW5zcG9ydCcpLnZhbChkYXRhLnRyYW5zcG9ydCB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuVFJBTlNQT1JUKTtcbiAgICAgICAgICAgICQoJyNmcm9tdXNlcicpLnZhbChkYXRhLmZyb211c2VyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tZG9tYWluJykudmFsKGRhdGEuZnJvbWRvbWFpbiB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjb3V0Ym91bmRfcHJveHknKS52YWwoZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBjaGVja2JveGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09ICcxJyB8fCBkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gdHJ1ZSkgJCgnI2Rpc2FibGVmcm9tdXNlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3lcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChkYXRhLnF1YWxpZnlmcmVxIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5RVUFMSUZZX0ZSRVEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsZXJJRC9ESUQgZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3NvdXJjZScpLnZhbChkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNkaWRfc291cmNlJykudmFsKGRhdGEuZGlkX3NvdXJjZSB8fCAnZGVmYXVsdCcpO1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuY2lkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuY2lkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS52YWwoZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfZW5kJykudmFsKGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNpZF9kaWRfZGVidWcgY2hlY2tib3hcbiAgICAgICAgICAgIGlmIChkYXRhLmNpZF9kaWRfZGVidWcgPT09ICcxJyB8fCBkYXRhLmNpZF9kaWRfZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdmFsdWVzIGFmdGVyIHNldHRpbmcgaGlkZGVuIGlucHV0c1xuICAgICAgICAgICAgY29uc3QgZHJvcGRvd25VcGRhdGVzID0gW1xuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcuZHRtZi1tb2RlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZHRtZm1vZGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLkRUTUZfTU9ERSB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcudHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5UUkFOU1BPUlQgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLnJlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlJFR0lTVFJBVElPTl9UWVBFIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy5jYWxsZXJpZC1zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0JyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcuZGlkLXNvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRyb3Bkb3duVXBkYXRlcy5mb3JFYWNoKCh7IHNlbGVjdG9yLCB2YWx1ZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzIC0gcG9wdWxhdGUgYWZ0ZXIgZm9ybSBpcyByZWFkeVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkICYmICEkKCcjaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlzaXAvU0lQLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzTWFwID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6ICgpID0+IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpLFxuICAgICAgICAgICAgaW5ib3VuZDogKCkgPT4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIG5vbmU6ICgpID0+IHRoaXMuZ2V0Tm9uZVJ1bGVzKCksXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHJ1bGVzTWFwW3JlZ1R5cGVdID8gcnVsZXNNYXBbcmVnVHlwZV0oKSA6IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLmFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZXMgLSBFeGlzdGluZyBydWxlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFJ1bGVzIHdpdGggQ2FsbGVySUQvRElEIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICBhZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKSB7XG4gICAgICAgIGNvbnN0IGNhbGxlcklkU291cmNlID0gJCgnI2NpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZGlkU291cmNlID0gJCgnI2RpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gaGVhZGVyIHZhbGlkYXRpb24gd2hlbiBjdXN0b20gc291cmNlIGlzIHNlbGVjdGVkXG4gICAgICAgIGNvbnN0IGN1c3RvbUhlYWRlclJ1bGVzID0ge1xuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IHx8ICdQbGVhc2Ugc3BlY2lmeSBjdXN0b20gaGVhZGVyIG5hbWUnLFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bQS1aYS16MC05LV9dKyQvXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQgfHwgJ0hlYWRlciBuYW1lIGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZScsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxlcklkU291cmNlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgICAgICAuLi5jdXN0b21IZWFkZXJSdWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRpZFNvdXJjZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICAgICAgLi4uY3VzdG9tSGVhZGVyUnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2V4IHZhbGlkYXRpb24gaWYgcHJvdmlkZWQgKG9wdGlvbmFsIGZpZWxkcylcbiAgICAgICAgY29uc3QgcmVnZXhWYWxpZGF0aW9uUnVsZSA9IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2NhbGxiYWNrJyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleCB8fCAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24nLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgpKSB7XG4gICAgICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgICAgICAuLi5yZWdleFZhbGlkYXRpb25SdWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoKSkge1xuICAgICAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICAgICAgLi4ucmVnZXhWYWxpZGF0aW9uUnVsZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdVc2VybmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMgYW5kIHN5bWJvbHM6IF8gLSAuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLi1dKyQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyB8fCAnVXNlcm5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzIGFuZCBzeW1ib2xzOiBfIC0gLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpIHtcbiAgICAgICAgY29uc3QgJGhvc3RMYWJlbFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2VsSG9zdCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI2VsUG9ydCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyNlbFVzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNlbFNlY3JldCcpLFxuICAgICAgICAgICAgYWRkaXRpb25hbEhvc3Q6ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXJJZDogJCgnI25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWyduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc2V0TmV0d29ya0ZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCcsICduZXR3b3JrRmlsdGVyJywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgaWYgKGNvbmZpZy5yZWFkb25seVVzZXJuYW1lKSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUudmFsKHByb3ZpZGVySWQpLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgaWYgaXQgbWF0Y2hlcyBwcm92aWRlciBJRCB3aGVuIG5vdCBpbmJvdW5kXG4gICAgICAgICAgICBpZiAoZmllbGRzLnVzZXJuYW1lLnZhbCgpID09PSBwcm92aWRlcklkICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlc2V0IG5ldHdvcmsgZmlsdGVyIGZvciBvdXRib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlc2V0TmV0d29ya0ZpbHRlcikge1xuICAgICAgICAgICAgZmllbGRzLm5ldHdvcmtGaWx0ZXJJZC52YWwoJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBmaWVsZHMgb3B0aW9uYWxcbiAgICAgICAgY29uZmlnLm1ha2VPcHRpb25hbD8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICAkKGAjZWwke2ZpZWxkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmllbGQuc2xpY2UoMSl9YCkucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIHNwZWNpZmllZCBmaWVsZHNcbiAgICAgICAgY29uZmlnLmNsZWFyVmFsaWRhdGlvbkZvcj8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZCk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZH1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTsgXG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICAvLyBVc2UgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIgaW5zdGVhZCBvZiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVsID0gJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLmNsb3Nlc3QoJy51aS5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwubGVuZ3RoID4gMCAmJiBlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnLmNhbGxlcmlkLXNvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnLmRpZC1zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn0iXX0=