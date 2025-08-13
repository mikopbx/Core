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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, TooltipBuilder, i18n */

/**
 * SIP provider management form
 * @class ProviderSIP
 */
var ProviderSIP = /*#__PURE__*/function (_ProviderBase) {
  _inherits(ProviderSIP, _ProviderBase);

  var _super = _createSuper(ProviderSIP);

  function ProviderSIP() {
    var _this;

    _classCallCheck(this, ProviderSIP);

    _this = _super.call(this, 'SIP');
    _this.$qualifyToggle = $('#qualify');
    _this.$qualifyFreqToggle = $('#qualify-freq');
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
      $('#disablefromuser input').on('change', function () {
        _this2.updateVisibilityElements();

        Form.dataChanged();
      }); // Re-initialize accordion with visibility update on open

      this.initializeAccordion(); // Initialize field help tooltips

      this.initializeFieldTooltips(); // Initialize tabs

      this.initializeTabs();
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

      Form.afterSubmitIndexUrl = globalRootUrl + 'providers/index/';
      Form.afterSubmitModifyUrl = globalRootUrl + 'providers/modify/';
      Form.initialize();
    }
    /**
     * Callback before form submission
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = this.$formObj.form('get values'); // Add provider type

      result.data.type = this.providerType; // Convert checkbox values to proper booleans

      var booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
      booleanFields.forEach(function (field) {
        if (result.data.hasOwnProperty(field)) {
          // Convert various checkbox representations to boolean
          result.data[field] = result.data[field] === true || result.data[field] === 'true' || result.data[field] === '1' || result.data[field] === 'on';
        }
      }); // Handle additional hosts for SIP - collect from table

      var additionalHosts = [];
      $('#additional-hosts-table tbody tr.host-row').each(function () {
        var host = $(this).find('td.address').text().trim();

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
     * Callback after form submission
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {
      _get(_getPrototypeOf(ProviderSIP.prototype), "cbAfterSendForm", this).call(this, response);

      if (response.result && response.data) {
        // Update form with response data if needed
        if (response.data.uniqid && !$('#uniqid').val()) {
          $('#uniqid').val(response.data.uniqid);
        } // The Form.js will handle the reload automatically if response.reload is present
        // For new records, REST API returns reload path like "providers/modifysip/SIP-TRUNK-xxx"

      }
    }
    /**
     * Initialize accordion with custom callbacks
     */

  }, {
    key: "initializeAccordion",
    value: function initializeAccordion() {
      var self = this;
      this.$accordions.accordion({
        onOpen: function onOpen() {
          // Update field visibility when accordion opens
          setTimeout(function () {
            self.updateVisibilityElements();
          }, 50);
        }
      });
    }
    /**
     * Initialize field help tooltips in firewall style
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      // Build tooltip data structures
      var registrationTypeData = {
        header: globalTranslate.pr_RegistrationTypeTooltip_header,
        list: [{
          term: globalTranslate.pr_RegistrationTypeTooltip_outbound,
          definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc
        }, {
          term: globalTranslate.pr_RegistrationTypeTooltip_inbound,
          definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc
        }, {
          term: globalTranslate.pr_RegistrationTypeTooltip_none,
          definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc
        }]
      };
      var networkFilterData = {
        header: globalTranslate.pr_NetworkFilterTooltip_header,
        description: globalTranslate.pr_NetworkFilterTooltip_desc,
        list: [{
          term: globalTranslate.pr_NetworkFilterTooltip_inbound,
          definition: globalTranslate.pr_NetworkFilterTooltip_inbound_desc
        }, {
          term: globalTranslate.pr_NetworkFilterTooltip_outbound,
          definition: globalTranslate.pr_NetworkFilterTooltip_outbound_desc
        }, {
          term: globalTranslate.pr_NetworkFilterTooltip_none,
          definition: globalTranslate.pr_NetworkFilterTooltip_none_desc
        }]
      };
      var receiveCallsData = {
        header: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_header,
        description: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_desc,
        warning: {
          header: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_warning_header,
          text: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_warning
        },
        list: [{
          term: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_application,
          definition: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_application_desc
        }]
      };
      var outboundProxyData = {
        header: globalTranslate.pr_OutboundProxyTooltip_header,
        description: globalTranslate.pr_OutboundProxyTooltip_desc,
        list: [{
          term: globalTranslate.pr_OutboundProxyTooltip_format,
          definition: globalTranslate.pr_OutboundProxyTooltip_format_examples
        }, {
          term: globalTranslate.pr_OutboundProxyTooltip_usage,
          definition: globalTranslate.pr_OutboundProxyTooltip_usage_desc
        }]
      };
      var transportProtocolData = {
        header: globalTranslate.pr_TransportProtocolTooltip_header,
        description: globalTranslate.pr_TransportProtocolTooltip_desc,
        list: [{
          term: globalTranslate.pr_TransportProtocolTooltip_protocols_header,
          definition: null
        }, {
          term: globalTranslate.pr_TransportProtocolTooltip_udp_tcp,
          definition: globalTranslate.pr_TransportProtocolTooltip_udp_tcp_desc
        }, {
          term: globalTranslate.pr_TransportProtocolTooltip_udp,
          definition: globalTranslate.pr_TransportProtocolTooltip_udp_desc
        }, {
          term: globalTranslate.pr_TransportProtocolTooltip_tcp,
          definition: globalTranslate.pr_TransportProtocolTooltip_tcp_desc
        }, {
          term: globalTranslate.pr_TransportProtocolTooltip_tls,
          definition: globalTranslate.pr_TransportProtocolTooltip_tls_desc
        }, {
          term: globalTranslate.pr_TransportProtocolTooltip_recommendations_header,
          definition: null
        }],
        list2: [globalTranslate.pr_TransportProtocolTooltip_rec_compatibility, globalTranslate.pr_TransportProtocolTooltip_rec_security, globalTranslate.pr_TransportProtocolTooltip_rec_provider]
      };
      var qualifySessionData = {
        header: globalTranslate.pr_QualifySessionTooltip_header,
        description: globalTranslate.pr_QualifySessionTooltip_desc,
        list: [{
          term: globalTranslate.pr_QualifySessionTooltip_purpose,
          definition: globalTranslate.pr_QualifySessionTooltip_purpose_desc
        }, {
          term: globalTranslate.pr_QualifySessionTooltip_recommendation,
          definition: globalTranslate.pr_QualifySessionTooltip_recommendation_desc
        }]
      };
      var fromRedefinitionData = {
        header: globalTranslate.pr_FromRedefinitionTooltip_header,
        warning: {
          text: globalTranslate.pr_FromRedefinitionTooltip_warning
        },
        list: [{
          term: globalTranslate.pr_FromRedefinitionTooltip_user,
          definition: globalTranslate.pr_FromRedefinitionTooltip_user_desc
        }, {
          term: globalTranslate.pr_FromRedefinitionTooltip_domain,
          definition: globalTranslate.pr_FromRedefinitionTooltip_domain_desc
        }, {
          term: globalTranslate.pr_FromRedefinitionTooltip_usage,
          definition: globalTranslate.pr_FromRedefinitionTooltip_usage_desc
        }]
      };
      var sipPortData = {
        header: globalTranslate.pr_SIPPortTooltip_header,
        description: globalTranslate.pr_SIPPortTooltip_desc,
        list: [{
          term: globalTranslate.pr_SIPPortTooltip_default,
          definition: globalTranslate.pr_SIPPortTooltip_default_value
        }, {
          term: globalTranslate.pr_SIPPortTooltip_standard_ports,
          definition: null
        }, {
          term: globalTranslate.pr_SIPPortTooltip_port_5060,
          definition: globalTranslate.pr_SIPPortTooltip_port_5060_desc
        }, {
          term: globalTranslate.pr_SIPPortTooltip_port_5061,
          definition: globalTranslate.pr_SIPPortTooltip_port_5061_desc
        }],
        note: globalTranslate.pr_SIPPortTooltip_note
      };
      var manualAttributesData = {
        header: globalTranslate.pr_ManualAttributesTooltip_header,
        description: globalTranslate.pr_ManualAttributesTooltip_desc,
        list: [{
          term: globalTranslate.pr_ManualAttributesTooltip_format,
          definition: globalTranslate.pr_ManualAttributesTooltip_format_desc
        }],
        list2: [{
          term: globalTranslate.pr_ManualAttributesTooltip_examples_header,
          definition: null
        }],
        examples: ['[endpoint]', 'contact_user=231', 'direct_media=no', 'rtp_symmetric=no', 'timers=10', 'max_retries=10', '', '', '[aor]', 'qualify_frequency=60', '', '', '[registration]', 'retry_interval=60', 'max_retries=10'],
        list3: [{
          term: globalTranslate.pr_ManualAttributesTooltip_common_params,
          definition: null
        }, {
          term: globalTranslate.pr_ManualAttributesTooltip_contact_user,
          definition: globalTranslate.pr_ManualAttributesTooltip_contact_user_desc
        }, {
          term: globalTranslate.pr_ManualAttributesTooltip_direct_media,
          definition: globalTranslate.pr_ManualAttributesTooltip_direct_media_desc
        }, {
          term: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric,
          definition: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric_desc
        }, {
          term: globalTranslate.pr_ManualAttributesTooltip_timers,
          definition: globalTranslate.pr_ManualAttributesTooltip_timers_desc
        }],
        note: globalTranslate.pr_ManualAttributesTooltip_warning
      };
      var providerHostData = {
        header: globalTranslate.pr_ProviderHostTooltip_header,
        description: globalTranslate.pr_ProviderHostTooltip_desc,
        list: [{
          term: globalTranslate.pr_ProviderHostTooltip_formats,
          definition: null
        }],
        list2: [globalTranslate.pr_ProviderHostTooltip_format_ip, globalTranslate.pr_ProviderHostTooltip_format_domain],
        list3: [{
          term: globalTranslate.pr_ProviderHostTooltip_outbound,
          definition: globalTranslate.pr_ProviderHostTooltip_outbound_desc
        }, {
          term: globalTranslate.pr_ProviderHostTooltip_none,
          definition: globalTranslate.pr_ProviderHostTooltip_none_desc
        }],
        note: globalTranslate.pr_ProviderHostTooltip_note
      };
      var additionalHostsData = {
        header: globalTranslate.pr_AdditionalHostsTooltip_header,
        description: globalTranslate.pr_AdditionalHostsTooltip_desc,
        list: [{
          term: globalTranslate.pr_AdditionalHostsTooltip_purposes,
          definition: null
        }],
        list2: [globalTranslate.pr_AdditionalHostsTooltip_purpose_id, globalTranslate.pr_AdditionalHostsTooltip_purpose_multi, globalTranslate.pr_AdditionalHostsTooltip_purpose_security],
        list3: [{
          term: globalTranslate.pr_AdditionalHostsTooltip_use_cases,
          definition: null
        }],
        list4: [globalTranslate.pr_AdditionalHostsTooltip_use_geo, globalTranslate.pr_AdditionalHostsTooltip_use_backup, globalTranslate.pr_AdditionalHostsTooltip_use_cloud],
        list5: [{
          term: globalTranslate.pr_AdditionalHostsTooltip_formats,
          definition: null
        }],
        list6: [globalTranslate.pr_AdditionalHostsTooltip_format_ip, globalTranslate.pr_AdditionalHostsTooltip_format_subnet, globalTranslate.pr_AdditionalHostsTooltip_format_domain],
        note: globalTranslate.pr_AdditionalHostsTooltip_important
      };
      var dtmfModeData = {
        header: globalTranslate.pr_DTMFModeTooltip_header,
        description: globalTranslate.pr_DTMFModeTooltip_desc,
        list: [{
          term: globalTranslate.pr_DTMFModeTooltip_modes_header,
          definition: null
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_auto,
          definition: globalTranslate.pr_DTMFModeTooltip_auto_desc
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_inband,
          definition: globalTranslate.pr_DTMFModeTooltip_inband_desc
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_info,
          definition: globalTranslate.pr_DTMFModeTooltip_info_desc
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_rfc4733,
          definition: globalTranslate.pr_DTMFModeTooltip_rfc4733_desc
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_auto_info,
          definition: globalTranslate.pr_DTMFModeTooltip_auto_info_desc
        }, {
          term: globalTranslate.pr_DTMFModeTooltip_usage_header,
          definition: null
        }],
        list2: [globalTranslate.pr_DTMFModeTooltip_usage_ivr, globalTranslate.pr_DTMFModeTooltip_usage_pin, globalTranslate.pr_DTMFModeTooltip_usage_conf, globalTranslate.pr_DTMFModeTooltip_usage_features],
        note: globalTranslate.pr_DTMFModeTooltip_recommendation_desc
      };
      var tooltipConfigs = {
        'registration_type': registrationTypeData,
        'receive_calls_without_auth': receiveCallsData,
        'network_filter': networkFilterData,
        'outbound_proxy': outboundProxyData,
        'transport_protocol': transportProtocolData,
        'qualify_session': qualifySessionData,
        'from_redefinition': fromRedefinitionData,
        'sip_port': sipPortData,
        'manual_attributes': manualAttributesData,
        'provider_host': providerHostData,
        'additional_hosts': additionalHostsData,
        'dtmf_mode': dtmfModeData
      }; // Initialize tooltips using TooltipBuilder

      TooltipBuilder.initialize(tooltipConfigs);
    }
    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var regType = $('#registration_type').val();

      switch (regType) {
        case 'outbound':
          return this.getOutboundRules();

        case 'inbound':
          return this.getInboundRules();

        case 'none':
          return this.getNoneRules();

        default:
          return this.getOutboundRules();
      }
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
      var elUniqId = $('#uniqid');
      var genPassword = $('#generate-new-password');
      var valUserName = $('#username');
      var valSecret = this.$secret; // Reset username only when switching from inbound to other types

      if (valUserName.val() === elUniqId.val() && regType !== 'inbound') {
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
        elAdditionalHost.show();
        elNetworkFilter.hide(); // Network filter not relevant for outbound

        $('#networkfilterid').val('none'); // Reset to default

        genPassword.hide();
      } else if (regType === 'inbound') {
        valUserName.val(elUniqId.val());
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
        elAdditionalHost.hide(); // Remove validation errors for hidden fields

        this.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
        this.$formObj.form('remove prompt', 'port');
        $('#port').closest('.field').removeClass('error'); // Restore network filter state if needed

        this.restoreNetworkFilterState();
      } else if (regType === 'none') {
        elHost.show();
        elUsername.show();
        elSecret.show();
        elPort.show();
        elAdditionalHost.show();
        elNetworkFilter.show(); // Network filter critical for none type (no auth)

        genPassword.hide(); // Show tooltip icon for password field

        this.showPasswordTooltip(); // Update field requirements - make password optional in none mode

        $('#elSecret').removeClass('required'); // Remove validation prompts for optional fields in none mode

        this.$formObj.form('remove prompt', 'username');
        this.$formObj.form('remove prompt', 'secret'); // Restore network filter state if needed

        this.restoreNetworkFilterState();
      } // Update element visibility based on 'disablefromuser' checkbox


      var el = $('#disablefromuser');
      var fromUser = $('#divFromUser');

      if (el.checkbox('is checked')) {
        fromUser.hide();
        fromUser.removeClass('visible');
      } else {
        fromUser.show();
        fromUser.addClass('visible');
      }
    }
  }]);

  return ProviderSIP;
}(ProviderBase);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQWNjb3JkaW9uIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJpbml0aWFsaXplVGFicyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIiRmb3JtT2JqIiwidXJsIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZvcm0iLCJ0eXBlIiwicHJvdmlkZXJUeXBlIiwiYm9vbGVhbkZpZWxkcyIsImZvckVhY2giLCJmaWVsZCIsImhhc093blByb3BlcnR5IiwiYWRkaXRpb25hbEhvc3RzIiwiZWFjaCIsImhvc3QiLCJmaW5kIiwidGV4dCIsInRyaW0iLCJwdXNoIiwiYWRkcmVzcyIsImxlbmd0aCIsInJlc3BvbnNlIiwidW5pcWlkIiwidmFsIiwic2VsZiIsIiRhY2NvcmRpb25zIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsInJlZ2lzdHJhdGlvblR5cGVEYXRhIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyIiwibGlzdCIsInRlcm0iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MiLCJuZXR3b3JrRmlsdGVyRGF0YSIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZV9kZXNjIiwicmVjZWl2ZUNhbGxzRGF0YSIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9oZWFkZXIiLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfZGVzYyIsIndhcm5pbmciLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZyIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwib3V0Ym91bmRQcm94eURhdGEiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2UiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZV9kZXNjIiwidHJhbnNwb3J0UHJvdG9jb2xEYXRhIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlciIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Byb3RvY29sc19oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHMiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImxpc3QyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5IiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19zZWN1cml0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXIiLCJxdWFsaWZ5U2Vzc2lvbkRhdGEiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzYyIsImZyb21SZWRlZmluaXRpb25EYXRhIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfd2FybmluZyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW4iLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW5fZGVzYyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzYyIsInNpcFBvcnREYXRhIiwicHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHQiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0X3ZhbHVlIiwicHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MSIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjIiwibm90ZSIsInByX1NJUFBvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRGF0YSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwibGlzdDMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcm92aWRlckhvc3REYXRhIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmQiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZSIsImFkZGl0aW9uYWxIb3N0c0RhdGEiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyIsImxpc3Q0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWQiLCJsaXN0NSIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyIsImxpc3Q2IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudCIsImR0bWZNb2RlRGF0YSIsInByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0byIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJ0b29sdGlwQ29uZmlncyIsIlRvb2x0aXBCdWlsZGVyIiwicmVnVHlwZSIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsInZhbHVlIiwiaG9zdElucHV0VmFsaWRhdGlvbiIsInByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsIiRob3N0TGFiZWxUZXh0IiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJlbEhvc3QiLCJlbFVzZXJuYW1lIiwiZWxTZWNyZXQiLCJlbFBvcnQiLCJlbEFkZGl0aW9uYWxIb3N0IiwiZWxOZXR3b3JrRmlsdGVyIiwiZWxVbmlxSWQiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwiJHNlY3JldCIsInJlbW92ZUF0dHIiLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwidXBkYXRlSG9zdExhYmVsIiwic2hvdyIsImhpZGUiLCJhdHRyIiwiZ2VuZXJhdGVQYXNzd29yZCIsImNsb3Nlc3QiLCJyZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlIiwic2hvd1Bhc3N3b3JkVG9vbHRpcCIsImVsIiwiZnJvbVVzZXIiLCJQcm92aWRlckJhc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQTs7QUFDViw4QkFBTSxLQUFOO0FBQ0EsVUFBS0MsY0FBTCxHQUFzQkMsQ0FBQyxDQUFDLFVBQUQsQ0FBdkI7QUFDQSxVQUFLQyxrQkFBTCxHQUEwQkQsQ0FBQyxDQUFDLGVBQUQsQ0FBM0I7QUFIVTtBQUliO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS0QsY0FBTCxDQUFvQkcsUUFBcEIsQ0FBNkI7QUFDekJDLFFBQUFBLFFBQVEsRUFBRSxvQkFBTTtBQUNaLGNBQUks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QUFkLENBQW1CLGVBQW5CLEVBQW9DLFVBQXBDO0FBQ0EsYUFBS25CLFFBQUwsQ0FBY21CLElBQWQsQ0FBbUIsZUFBbkIsRUFBb0MsUUFBcEMsRUFqQjJCLENBbUIzQjs7QUFDQSxhQUFLNk4seUJBQUw7QUFDSCxPQWxGc0IsQ0FvRnZCOzs7QUFDQSxVQUFNRSxFQUFFLEdBQUdwUSxDQUFDLENBQUMsa0JBQUQsQ0FBWjtBQUNBLFVBQU1xUSxRQUFRLEdBQUdyUSxDQUFDLENBQUMsY0FBRCxDQUFsQjs7QUFDQSxVQUFJb1EsRUFBRSxDQUFDbFEsUUFBSCxDQUFZLFlBQVosQ0FBSixFQUErQjtBQUMzQm1RLFFBQUFBLFFBQVEsQ0FBQ1AsSUFBVDtBQUNBTyxRQUFBQSxRQUFRLENBQUNqUSxXQUFULENBQXFCLFNBQXJCO0FBQ0gsT0FIRCxNQUdPO0FBQ0hpUSxRQUFBQSxRQUFRLENBQUNSLElBQVQ7QUFDQVEsUUFBQUEsUUFBUSxDQUFDaFEsUUFBVCxDQUFrQixTQUFsQjtBQUNIO0FBQ0o7Ozs7RUF4eEJxQmlRLFkiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFRvb2x0aXBCdWlsZGVyLCBpMThuICovXG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpOyBcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZGlzYWJsZWZyb211c2VyIGlucHV0Jykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCB2aXNpYmlsaXR5IHVwZGF0ZSBvbiBvcGVuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogUHJvdmlkZXJzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdwcm92aWRlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAncHJvdmlkZXJzL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gcHJvcGVyIGJvb2xlYW5zXG4gICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbJ2Rpc2FibGVkJywgJ3F1YWxpZnknLCAnZGlzYWJsZWZyb211c2VyJywgJ25vcmVnaXN0ZXInLCAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnXTtcbiAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdmFyaW91cyBjaGVja2JveCByZXByZXNlbnRhdGlvbnMgdG8gYm9vbGVhblxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9IHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gdHJ1ZSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICd0cnVlJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICcxJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICdvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUCAtIGNvbGxlY3QgZnJvbSB0YWJsZVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQodGhpcykuZmluZCgndGQuYWRkcmVzcycpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKHthZGRyZXNzOiBob3N0fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEudW5pcWlkICYmICEkKCcjdW5pcWlkJykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjdW5pcWlkJykudmFsKHJlc3BvbnNlLmRhdGEudW5pcWlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlzaXAvU0lQLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjdXN0b20gY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHMgaW4gZmlyZXdhbGwgc3R5bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBvdXRib3VuZFByb3h5RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9mb3JtYXRfZXhhbXBsZXNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0cmFuc3BvcnRQcm90b2NvbERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBxdWFsaWZ5U2Vzc2lvbkRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGZyb21SZWRlZmluaXRpb25EYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2lwUG9ydERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3N0YW5kYXJkX3BvcnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBtYW51YWxBdHRyaWJ1dGVzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAnY29udGFjdF91c2VyPTIzMScsXG4gICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgJ3J0cF9zeW1tZXRyaWM9bm8nLFxuICAgICAgICAgICAgICAgICd0aW1lcnM9MTAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCcsXG4gICAgICAgICAgICAgICAgJycsIFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbYW9yXScsXG4gICAgICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcXVlbmN5PTYwJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnW3JlZ2lzdHJhdGlvbl0nLFxuICAgICAgICAgICAgICAgICdyZXRyeV9pbnRlcnZhbD02MCcsXG4gICAgICAgICAgICAgICAgJ21heF9yZXRyaWVzPTEwJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpY19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySG9zdERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9tdWx0aSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9nZW8sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnRcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkdG1mTW9kZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfZmVhdHVyZXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgICdyZWdpc3RyYXRpb25fdHlwZSc6IHJlZ2lzdHJhdGlvblR5cGVEYXRhLFxuICAgICAgICAgICAgJ3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJzogcmVjZWl2ZUNhbGxzRGF0YSxcbiAgICAgICAgICAgICduZXR3b3JrX2ZpbHRlcic6IG5ldHdvcmtGaWx0ZXJEYXRhLFxuICAgICAgICAgICAgJ291dGJvdW5kX3Byb3h5Jzogb3V0Ym91bmRQcm94eURhdGEsXG4gICAgICAgICAgICAndHJhbnNwb3J0X3Byb3RvY29sJzogdHJhbnNwb3J0UHJvdG9jb2xEYXRhLFxuICAgICAgICAgICAgJ3F1YWxpZnlfc2Vzc2lvbic6IHF1YWxpZnlTZXNzaW9uRGF0YSxcbiAgICAgICAgICAgICdmcm9tX3JlZGVmaW5pdGlvbic6IGZyb21SZWRlZmluaXRpb25EYXRhLFxuICAgICAgICAgICAgJ3NpcF9wb3J0Jzogc2lwUG9ydERhdGEsXG4gICAgICAgICAgICAnbWFudWFsX2F0dHJpYnV0ZXMnOiBtYW51YWxBdHRyaWJ1dGVzRGF0YSxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JzogcHJvdmlkZXJIb3N0RGF0YSxcbiAgICAgICAgICAgICdhZGRpdGlvbmFsX2hvc3RzJzogYWRkaXRpb25hbEhvc3RzRGF0YSxcbiAgICAgICAgICAgICdkdG1mX21vZGUnOiBkdG1mTW9kZURhdGFcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXJcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChyZWdUeXBlKSB7XG4gICAgICAgICAgICBjYXNlICdvdXRib3VuZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnaW5ib3VuZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0SW5ib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXROb25lUnVsZXMoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE91dGJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE5vbmVSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKSB7XG4gICAgICAgIGNvbnN0ICRob3N0TGFiZWxUZXh0ID0gJCgnI2hvc3RMYWJlbFRleHQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgaW5ib3VuZCwgdGhlIGZpZWxkIGlzIGhpZGRlbiBzbyBubyBuZWVkIHRvIHVwZGF0ZSBsYWJlbFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkgeyBcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsQWRkaXRpb25hbEhvc3QgPSAkKCcjZWxBZGRpdGlvbmFsSG9zdHMnKTtcbiAgICAgICAgY29uc3QgZWxOZXR3b3JrRmlsdGVyID0gJCgnI2VsTmV0d29ya0ZpbHRlcicpO1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGVsVW5pcUlkID0gJCgnI3VuaXFpZCcpO1xuICAgICAgICBjb25zdCBnZW5QYXNzd29yZCA9ICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKTtcblxuICAgICAgICBjb25zdCB2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBjb25zdCB2YWxTZWNyZXQgPSB0aGlzLiRzZWNyZXQ7IFxuXG4gICAgICAgIC8vIFJlc2V0IHVzZXJuYW1lIG9ubHkgd2hlbiBzd2l0Y2hpbmcgZnJvbSBpbmJvdW5kIHRvIG90aGVyIHR5cGVzXG4gICAgICAgIGlmICh2YWxVc2VyTmFtZS52YWwoKSA9PT0gZWxVbmlxSWQudmFsKCkgJiYgcmVnVHlwZSAhPT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBwYXNzd29yZCB0b29sdGlwIGJ5IGRlZmF1bHRcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTtcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuaGlkZSgpOyAvLyBOZXR3b3JrIGZpbHRlciBub3QgcmVsZXZhbnQgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCdub25lJyk7IC8vIFJlc2V0IHRvIGRlZmF1bHRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb24gaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbEhvc3QuaGlkZSgpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuaGlkZSgpOyAvLyBQb3J0IG5vdCBuZWVkZWQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBjcml0aWNhbCBmb3IgaW5ib3VuZCBzZWN1cml0eVxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgZWxBZGRpdGlvbmFsSG9zdC5oaWRlKCk7IFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG5ldHdvcmsgZmlsdGVyIHN0YXRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgdGhpcy5yZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBjcml0aWNhbCBmb3Igbm9uZSB0eXBlIChubyBhdXRoKVxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHRvb2x0aXAgaWNvbiBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgcmVxdWlyZW1lbnRzIC0gbWFrZSBwYXNzd29yZCBvcHRpb25hbCBpbiBub25lIG1vZGVcbiAgICAgICAgICAgICQoJyNlbFNlY3JldCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHRzIGZvciBvcHRpb25hbCBmaWVsZHMgaW4gbm9uZSBtb2RlXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAndXNlcm5hbWUnKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBuZXR3b3JrIGZpbHRlciBzdGF0ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICBjb25zdCBlbCA9ICQoJyNkaXNhYmxlZnJvbXVzZXInKTtcbiAgICAgICAgY29uc3QgZnJvbVVzZXIgPSAkKCcjZGl2RnJvbVVzZXInKTtcbiAgICAgICAgaWYgKGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==