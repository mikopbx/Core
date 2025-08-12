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

      this.initializeFieldTooltips();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQWNjb3JkaW9uIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCIkZm9ybU9iaiIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJQcm92aWRlcnNBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJmb3JtIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsImJvb2xlYW5GaWVsZHMiLCJmb3JFYWNoIiwiZmllbGQiLCJoYXNPd25Qcm9wZXJ0eSIsImFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJob3N0IiwiZmluZCIsInRleHQiLCJ0cmltIiwicHVzaCIsImFkZHJlc3MiLCJsZW5ndGgiLCJyZXNwb25zZSIsInVuaXFpZCIsInZhbCIsInNlbGYiLCIkYWNjb3JkaW9ucyIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJyZWdpc3RyYXRpb25UeXBlRGF0YSIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlciIsImxpc3QiLCJ0ZXJtIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQiLCJkZWZpbml0aW9uIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIiwibmV0d29ya0ZpbHRlckRhdGEiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzYyIsInJlY2VpdmVDYWxsc0RhdGEiLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyIiwicHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwicHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwicHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmciLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb24iLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzYyIsIm91dGJvdW5kUHJveHlEYXRhIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfaGVhZGVyIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdCIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlcyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzYyIsInRyYW5zcG9ydFByb3RvY29sRGF0YSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHkiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyIiwicXVhbGlmeVNlc3Npb25EYXRhIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlciIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJmcm9tUmVkZWZpbml0aW9uRGF0YSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2hlYWRlciIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmciLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2MiLCJzaXBQb3J0RGF0YSIsInByX1NJUFBvcnRUb29sdGlwX2hlYWRlciIsInByX1NJUFBvcnRUb29sdGlwX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0IiwicHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdF92YWx1ZSIsInByX1NJUFBvcnRUb29sdGlwX3N0YW5kYXJkX3BvcnRzIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYwIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYwX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjEiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjFfZGVzYyIsIm5vdGUiLCJwcl9TSVBQb3J0VG9vbHRpcF9ub3RlIiwibWFudWFsQXR0cmlidXRlc0RhdGEiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0IiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleGFtcGxlcyIsImxpc3QzIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlcl9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpY19kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIiwicHJvdmlkZXJIb3N0RGF0YSIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUiLCJhZGRpdGlvbmFsSG9zdHNEYXRhIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMiLCJsaXN0NCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkIiwibGlzdDUiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMiLCJsaXN0NiIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnQiLCJkdG1mTW9kZURhdGEiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZCIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmZvIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2l2ciIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4iLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfY29uZiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9mZWF0dXJlcyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjIiwidG9vbHRpcENvbmZpZ3MiLCJUb29sdGlwQnVpbGRlciIsInJlZ1R5cGUiLCJnZXRPdXRib3VuZFJ1bGVzIiwiZ2V0SW5ib3VuZFJ1bGVzIiwiZ2V0Tm9uZVJ1bGVzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0Iiwib3B0aW9uYWwiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJ2YWx1ZSIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkaG9zdExhYmVsVGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwiZWxIb3N0IiwiZWxVc2VybmFtZSIsImVsU2VjcmV0IiwiZWxQb3J0IiwiZWxBZGRpdGlvbmFsSG9zdCIsImVsTmV0d29ya0ZpbHRlciIsImVsVW5pcUlkIiwiZ2VuUGFzc3dvcmQiLCJ2YWxVc2VyTmFtZSIsInZhbFNlY3JldCIsIiRzZWNyZXQiLCJyZW1vdmVBdHRyIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInVwZGF0ZUhvc3RMYWJlbCIsInNob3ciLCJoaWRlIiwiYXR0ciIsImdlbmVyYXRlUGFzc3dvcmQiLCJjbG9zZXN0IiwicmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJlbCIsImZyb21Vc2VyIiwiUHJvdmlkZXJCYXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUE7O0FBQ1YsOEJBQU0sS0FBTjtBQUNBLFVBQUtDLGNBQUwsR0FBc0JDLENBQUMsQ0FBQyxVQUFELENBQXZCO0FBQ0EsVUFBS0Msa0JBQUwsR0FBMEJELENBQUMsQ0FBQyxlQUFELENBQTNCO0FBSFU7QUFJYjtBQUVEO0FBQ0o7QUFDQTs7Ozs7V0FDSSxzQkFBYTtBQUFBOztBQUNULGtGQURTLENBR1Q7OztBQUNBLFdBQUtELGNBQUwsQ0FBb0JHLFFBQXBCLENBQTZCO0FBQ3pCQyxRQUFBQSxRQUFRLEVBQUUsb0JBQU07QUFDWixjQUFJLE1BQUksQ0FBQ0osY0FBTCxDQUFvQkcsUUFBcEIsQ0FBNkIsWUFBN0IsQ0FBSixFQUFnRDtBQUM1QyxZQUFBLE1BQUksQ0FBQ0Qsa0JBQUwsQ0FBd0JHLFdBQXhCLENBQW9DLFVBQXBDO0FBQ0gsV0FGRCxNQUVPO0FBQ0gsWUFBQSxNQUFJLENBQUNILGtCQUFMLENBQXdCSSxRQUF4QixDQUFpQyxVQUFqQztBQUNIO0FBQ0o7QUFQd0IsT0FBN0I7QUFVQUwsTUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJNLEVBQTVCLENBQStCLFFBQS9CLEVBQXlDLFlBQU07QUFDM0MsUUFBQSxNQUFJLENBQUNDLHdCQUFMOztBQUNBQyxRQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxPQUhELEVBZFMsQ0FtQlQ7O0FBQ0EsV0FBS0MsbUJBQUwsR0FwQlMsQ0FzQlQ7O0FBQ0EsV0FBS0MsdUJBQUw7QUFDSDtBQUNEO0FBQ0o7QUFDQTs7OztXQUNJLDBCQUFpQjtBQUNiSCxNQUFBQSxJQUFJLENBQUNJLFFBQUwsR0FBZ0IsS0FBS0EsUUFBckI7QUFDQUosTUFBQUEsSUFBSSxDQUFDSyxHQUFMLEdBQVcsR0FBWCxDQUZhLENBRUc7O0FBQ2hCTCxNQUFBQSxJQUFJLENBQUNNLGFBQUwsR0FBcUIsS0FBS0MsZ0JBQUwsRUFBckI7QUFDQVAsTUFBQUEsSUFBSSxDQUFDUSxnQkFBTCxHQUF3QixLQUFLQSxnQkFBTCxDQUFzQkMsSUFBdEIsQ0FBMkIsSUFBM0IsQ0FBeEI7QUFDQVQsTUFBQUEsSUFBSSxDQUFDVSxlQUFMLEdBQXVCLEtBQUtBLGVBQUwsQ0FBcUJELElBQXJCLENBQTBCLElBQTFCLENBQXZCLENBTGEsQ0FPYjs7QUFDQVQsTUFBQUEsSUFBSSxDQUFDVyxXQUFMLEdBQW1CO0FBQ2ZDLFFBQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLFFBQUFBLFNBQVMsRUFBRUMsWUFGSTtBQUdmQyxRQUFBQSxVQUFVLEVBQUU7QUFIRyxPQUFuQixDQVJhLENBY2I7O0FBQ0FmLE1BQUFBLElBQUksQ0FBQ2dCLG1CQUFMLEdBQTJCQyxhQUFhLEdBQUcsa0JBQTNDO0FBQ0FqQixNQUFBQSxJQUFJLENBQUNrQixvQkFBTCxHQUE0QkQsYUFBYSxHQUFHLG1CQUE1QztBQUVBakIsTUFBQUEsSUFBSSxDQUFDbUIsVUFBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksMEJBQWlCQyxRQUFqQixFQUEyQjtBQUN2QixVQUFNQyxNQUFNLEdBQUdELFFBQWY7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWMsS0FBS2xCLFFBQUwsQ0FBY21CLElBQWQsQ0FBbUIsWUFBbkIsQ0FBZCxDQUZ1QixDQUl2Qjs7QUFDQUYsTUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlFLElBQVosR0FBbUIsS0FBS0MsWUFBeEIsQ0FMdUIsQ0FPdkI7O0FBQ0EsVUFBTUMsYUFBYSxHQUFHLENBQUMsVUFBRCxFQUFhLFNBQWIsRUFBd0IsaUJBQXhCLEVBQTJDLFlBQTNDLEVBQXlELDRCQUF6RCxDQUF0QjtBQUNBQSxNQUFBQSxhQUFhLENBQUNDLE9BQWQsQ0FBc0IsVUFBQ0MsS0FBRCxFQUFXO0FBQzdCLFlBQUlQLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTyxjQUFaLENBQTJCRCxLQUEzQixDQUFKLEVBQXVDO0FBQ25DO0FBQ0FQLFVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTSxLQUFaLElBQXFCUCxNQUFNLENBQUNDLElBQVAsQ0FBWU0sS0FBWixNQUF1QixJQUF2QixJQUNBUCxNQUFNLENBQUNDLElBQVAsQ0FBWU0sS0FBWixNQUF1QixNQUR2QixJQUVBUCxNQUFNLENBQUNDLElBQVAsQ0FBWU0sS0FBWixNQUF1QixHQUZ2QixJQUdBUCxNQUFNLENBQUNDLElBQVAsQ0FBWU0sS0FBWixNQUF1QixJQUg1QztBQUlIO0FBQ0osT0FSRCxFQVR1QixDQW1CdkI7O0FBQ0EsVUFBTUUsZUFBZSxHQUFHLEVBQXhCO0FBQ0F0QyxNQUFBQSxDQUFDLENBQUMsMkNBQUQsQ0FBRCxDQUErQ3VDLElBQS9DLENBQW9ELFlBQVc7QUFDM0QsWUFBTUMsSUFBSSxHQUFHeEMsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFReUMsSUFBUixDQUFhLFlBQWIsRUFBMkJDLElBQTNCLEdBQWtDQyxJQUFsQyxFQUFiOztBQUNBLFlBQUlILElBQUosRUFBVTtBQUNORixVQUFBQSxlQUFlLENBQUNNLElBQWhCLENBQXFCO0FBQUNDLFlBQUFBLE9BQU8sRUFBRUw7QUFBVixXQUFyQjtBQUNIO0FBQ0osT0FMRCxFQXJCdUIsQ0E0QnZCOztBQUNBLFVBQUlGLGVBQWUsQ0FBQ1EsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUJqQixRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWVEsZUFBWixHQUE4QkEsZUFBOUI7QUFDSDs7QUFFRCxhQUFPVCxNQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSx5QkFBZ0JrQixRQUFoQixFQUEwQjtBQUN0Qix1RkFBc0JBLFFBQXRCOztBQUVBLFVBQUlBLFFBQVEsQ0FBQ2xCLE1BQVQsSUFBbUJrQixRQUFRLENBQUNqQixJQUFoQyxFQUFzQztBQUNsQztBQUNBLFlBQUlpQixRQUFRLENBQUNqQixJQUFULENBQWNrQixNQUFkLElBQXdCLENBQUNoRCxDQUFDLENBQUMsU0FBRCxDQUFELENBQWFpRCxHQUFiLEVBQTdCLEVBQWlEO0FBQzdDakQsVUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhaUQsR0FBYixDQUFpQkYsUUFBUSxDQUFDakIsSUFBVCxDQUFja0IsTUFBL0I7QUFDSCxTQUppQyxDQU1sQztBQUNBOztBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwrQkFBc0I7QUFDbEIsVUFBTUUsSUFBSSxHQUFHLElBQWI7QUFDQSxXQUFLQyxXQUFMLENBQWlCQyxTQUFqQixDQUEyQjtBQUN2QkMsUUFBQUEsTUFBTSxFQUFFLGtCQUFXO0FBQ2Y7QUFDQUMsVUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYkosWUFBQUEsSUFBSSxDQUFDM0Msd0JBQUw7QUFDSCxXQUZTLEVBRVAsRUFGTyxDQUFWO0FBR0g7QUFOc0IsT0FBM0I7QUFRSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLG1DQUEwQjtBQUN0QjtBQUNBLFVBQU1nRCxvQkFBb0IsR0FBRztBQUN6QkMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDLGlDQURDO0FBRXpCQyxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ0ksbUNBRDFCO0FBRUlDLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDTTtBQUZoQyxTQURFLEVBS0Y7QUFDSUgsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNPLGtDQUQxQjtBQUVJRixVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ1E7QUFGaEMsU0FMRSxFQVNGO0FBQ0lMLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDUywrQkFEMUI7QUFFSUosVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUNVO0FBRmhDLFNBVEU7QUFGbUIsT0FBN0I7QUFrQkEsVUFBTUMsaUJBQWlCLEdBQUc7QUFDdEJaLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDWSw4QkFERjtBQUV0QkMsUUFBQUEsV0FBVyxFQUFFYixlQUFlLENBQUNjLDRCQUZQO0FBR3RCWixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ2UsK0JBRDFCO0FBRUlWLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDZ0I7QUFGaEMsU0FERSxFQUtGO0FBQ0liLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDaUIsZ0NBRDFCO0FBRUlaLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDa0I7QUFGaEMsU0FMRSxFQVNGO0FBQ0lmLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDbUIsNEJBRDFCO0FBRUlkLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDb0I7QUFGaEMsU0FURTtBQUhnQixPQUExQjtBQW1CQSxVQUFNQyxnQkFBZ0IsR0FBRztBQUNyQnRCLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0Isd0NBREg7QUFFckJULFFBQUFBLFdBQVcsRUFBRWIsZUFBZSxDQUFDdUIsc0NBRlI7QUFHckJDLFFBQUFBLE9BQU8sRUFBRTtBQUNMekIsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN5QixnREFEbkI7QUFFTHhDLFVBQUFBLElBQUksRUFBRWUsZUFBZSxDQUFDMEI7QUFGakIsU0FIWTtBQU9yQnhCLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDMkIsNkNBRDFCO0FBRUl0QixVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzRCO0FBRmhDLFNBREU7QUFQZSxPQUF6QjtBQWVBLFVBQU1DLGlCQUFpQixHQUFHO0FBQ3RCOUIsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM4Qiw4QkFERjtBQUV0QmpCLFFBQUFBLFdBQVcsRUFBRWIsZUFBZSxDQUFDK0IsNEJBRlA7QUFHdEI3QixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ2dDLDhCQUQxQjtBQUVJM0IsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUNpQztBQUZoQyxTQURFLEVBS0Y7QUFDSTlCLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDa0MsNkJBRDFCO0FBRUk3QixVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ21DO0FBRmhDLFNBTEU7QUFIZ0IsT0FBMUI7QUFlQSxVQUFNQyxxQkFBcUIsR0FBRztBQUMxQnJDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDcUMsa0NBREU7QUFFMUJ4QixRQUFBQSxXQUFXLEVBQUViLGVBQWUsQ0FBQ3NDLGdDQUZIO0FBRzFCcEMsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUN1Qyw0Q0FEMUI7QUFFSWxDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0Y7QUFDSUYsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUN3QyxtQ0FEMUI7QUFFSW5DLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDeUM7QUFGaEMsU0FMRSxFQVNGO0FBQ0l0QyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQzBDLCtCQUQxQjtBQUVJckMsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUMyQztBQUZoQyxTQVRFLEVBYUY7QUFDSXhDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDNEMsK0JBRDFCO0FBRUl2QyxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzZDO0FBRmhDLFNBYkUsRUFpQkY7QUFDSTFDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDOEMsK0JBRDFCO0FBRUl6QyxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQytDO0FBRmhDLFNBakJFLEVBcUJGO0FBQ0k1QyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ2dELGtEQUQxQjtBQUVJM0MsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBckJFLENBSG9CO0FBNkIxQjRDLFFBQUFBLEtBQUssRUFBRSxDQUNIakQsZUFBZSxDQUFDa0QsNkNBRGIsRUFFSGxELGVBQWUsQ0FBQ21ELHdDQUZiLEVBR0huRCxlQUFlLENBQUNvRCx3Q0FIYjtBQTdCbUIsT0FBOUI7QUFvQ0EsVUFBTUMsa0JBQWtCLEdBQUc7QUFDdkJ0RCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3NELCtCQUREO0FBRXZCekMsUUFBQUEsV0FBVyxFQUFFYixlQUFlLENBQUN1RCw2QkFGTjtBQUd2QnJELFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDd0QsZ0NBRDFCO0FBRUluRCxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ3lEO0FBRmhDLFNBREUsRUFLRjtBQUNJdEQsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUMwRCx1Q0FEMUI7QUFFSXJELFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDMkQ7QUFGaEMsU0FMRTtBQUhpQixPQUEzQjtBQWVBLFVBQU1DLG9CQUFvQixHQUFHO0FBQ3pCN0QsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM2RCxpQ0FEQztBQUV6QnJDLFFBQUFBLE9BQU8sRUFBRTtBQUNMdkMsVUFBQUEsSUFBSSxFQUFFZSxlQUFlLENBQUM4RDtBQURqQixTQUZnQjtBQUt6QjVELFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDK0QsK0JBRDFCO0FBRUkxRCxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ2dFO0FBRmhDLFNBREUsRUFLRjtBQUNJN0QsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNpRSxpQ0FEMUI7QUFFSTVELFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDa0U7QUFGaEMsU0FMRSxFQVNGO0FBQ0kvRCxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ21FLGdDQUQxQjtBQUVJOUQsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUNvRTtBQUZoQyxTQVRFO0FBTG1CLE9BQTdCO0FBcUJBLFVBQU1DLFdBQVcsR0FBRztBQUNoQnRFLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0Usd0JBRFI7QUFFaEJ6RCxRQUFBQSxXQUFXLEVBQUViLGVBQWUsQ0FBQ3VFLHNCQUZiO0FBR2hCckUsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUN3RSx5QkFEMUI7QUFFSW5FLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDeUU7QUFGaEMsU0FERSxFQUtGO0FBQ0l0RSxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQzBFLGdDQUQxQjtBQUVJckUsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBTEUsRUFTRjtBQUNJRixVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQzJFLDJCQUQxQjtBQUVJdEUsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUM0RTtBQUZoQyxTQVRFLEVBYUY7QUFDSXpFLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDNkUsMkJBRDFCO0FBRUl4RSxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzhFO0FBRmhDLFNBYkUsQ0FIVTtBQXFCaEJDLFFBQUFBLElBQUksRUFBRS9FLGVBQWUsQ0FBQ2dGO0FBckJOLE9BQXBCO0FBd0JBLFVBQU1DLG9CQUFvQixHQUFHO0FBQ3pCbEYsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNrRixpQ0FEQztBQUV6QnJFLFFBQUFBLFdBQVcsRUFBRWIsZUFBZSxDQUFDbUYsK0JBRko7QUFHekJqRixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ29GLGlDQUQxQjtBQUVJL0UsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUNxRjtBQUZoQyxTQURFLENBSG1CO0FBU3pCcEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTlDLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDc0YsMENBRDFCO0FBRUlqRixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQVRrQjtBQWV6QmtGLFFBQUFBLFFBQVEsRUFBRSxDQUNOLFlBRE0sRUFFTixrQkFGTSxFQUdOLGlCQUhNLEVBSU4sa0JBSk0sRUFLTixXQUxNLEVBTU4sZ0JBTk0sRUFPTixFQVBNLEVBUU4sRUFSTSxFQVNOLE9BVE0sRUFVTixzQkFWTSxFQVdOLEVBWE0sRUFZTixFQVpNLEVBYU4sZ0JBYk0sRUFjTixtQkFkTSxFQWVOLGdCQWZNLENBZmU7QUFnQ3pCQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckYsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUN5Rix3Q0FEMUI7QUFFSXBGLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLEVBS0g7QUFDSUYsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUMwRix1Q0FEMUI7QUFFSXJGLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDMkY7QUFGaEMsU0FMRyxFQVNIO0FBQ0l4RixVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQzRGLHVDQUQxQjtBQUVJdkYsVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUM2RjtBQUZoQyxTQVRHLEVBYUg7QUFDSTFGLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDOEYsd0NBRDFCO0FBRUl6RixVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQytGO0FBRmhDLFNBYkcsRUFpQkg7QUFDSTVGLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDZ0csaUNBRDFCO0FBRUkzRixVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ2lHO0FBRmhDLFNBakJHLENBaENrQjtBQXNEekJsQixRQUFBQSxJQUFJLEVBQUUvRSxlQUFlLENBQUNrRztBQXRERyxPQUE3QjtBQXlEQSxVQUFNQyxnQkFBZ0IsR0FBRztBQUNyQnBHLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0csNkJBREg7QUFFckJ2RixRQUFBQSxXQUFXLEVBQUViLGVBQWUsQ0FBQ3FHLDJCQUZSO0FBR3JCbkcsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNzRyw4QkFEMUI7QUFFSWpHLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSGU7QUFTckI0QyxRQUFBQSxLQUFLLEVBQUUsQ0FDSGpELGVBQWUsQ0FBQ3VHLGdDQURiLEVBRUh2RyxlQUFlLENBQUN3RyxvQ0FGYixDQVRjO0FBYXJCaEIsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSXJGLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDeUcsK0JBRDFCO0FBRUlwRyxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzBHO0FBRmhDLFNBREcsRUFLSDtBQUNJdkcsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUMyRywyQkFEMUI7QUFFSXRHLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDNEc7QUFGaEMsU0FMRyxDQWJjO0FBdUJyQjdCLFFBQUFBLElBQUksRUFBRS9FLGVBQWUsQ0FBQzZHO0FBdkJELE9BQXpCO0FBMEJBLFVBQU1DLG1CQUFtQixHQUFHO0FBQ3hCL0csUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMrRyxnQ0FEQTtBQUV4QmxHLFFBQUFBLFdBQVcsRUFBRWIsZUFBZSxDQUFDZ0gsOEJBRkw7QUFHeEI5RyxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ2lILGtDQUQxQjtBQUVJNUcsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FIa0I7QUFTeEI0QyxRQUFBQSxLQUFLLEVBQUUsQ0FDSGpELGVBQWUsQ0FBQ2tILG9DQURiLEVBRUhsSCxlQUFlLENBQUNtSCx1Q0FGYixFQUdIbkgsZUFBZSxDQUFDb0gsMENBSGIsQ0FUaUI7QUFjeEI1QixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckYsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNxSCxtQ0FEMUI7QUFFSWhILFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZGlCO0FBb0J4QmlILFFBQUFBLEtBQUssRUFBRSxDQUNIdEgsZUFBZSxDQUFDdUgsaUNBRGIsRUFFSHZILGVBQWUsQ0FBQ3dILG9DQUZiLEVBR0h4SCxlQUFlLENBQUN5SCxtQ0FIYixDQXBCaUI7QUF5QnhCQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJdkgsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUMySCxpQ0FEMUI7QUFFSXRILFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBekJpQjtBQStCeEJ1SCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDVILGVBQWUsQ0FBQzZILG1DQURiLEVBRUg3SCxlQUFlLENBQUM4SCx1Q0FGYixFQUdIOUgsZUFBZSxDQUFDK0gsdUNBSGIsQ0EvQmlCO0FBb0N4QmhELFFBQUFBLElBQUksRUFBRS9FLGVBQWUsQ0FBQ2dJO0FBcENFLE9BQTVCO0FBdUNBLFVBQU1DLFlBQVksR0FBRztBQUNqQmxJLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0kseUJBRFA7QUFFakJySCxRQUFBQSxXQUFXLEVBQUViLGVBQWUsQ0FBQ21JLHVCQUZaO0FBR2pCakksUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNvSSwrQkFEMUI7QUFFSS9ILFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0Y7QUFDSUYsVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNxSSx1QkFEMUI7QUFFSWhJLFVBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDc0k7QUFGaEMsU0FMRSxFQVNGO0FBQ0luSSxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ3VJLHlCQUQxQjtBQUVJbEksVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUN3STtBQUZoQyxTQVRFLEVBYUY7QUFDSXJJLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDeUksdUJBRDFCO0FBRUlwSSxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzBJO0FBRmhDLFNBYkUsRUFpQkY7QUFDSXZJLFVBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDMkksMEJBRDFCO0FBRUl0SSxVQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQzRJO0FBRmhDLFNBakJFLEVBcUJGO0FBQ0l6SSxVQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQzZJLDRCQUQxQjtBQUVJeEksVUFBQUEsVUFBVSxFQUFFTCxlQUFlLENBQUM4STtBQUZoQyxTQXJCRSxFQXlCRjtBQUNJM0ksVUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUMrSSwrQkFEMUI7QUFFSTFJLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQXpCRSxDQUhXO0FBaUNqQjRDLFFBQUFBLEtBQUssRUFBRSxDQUNIakQsZUFBZSxDQUFDZ0osNEJBRGIsRUFFSGhKLGVBQWUsQ0FBQ2lKLDRCQUZiLEVBR0hqSixlQUFlLENBQUNrSiw2QkFIYixFQUlIbEosZUFBZSxDQUFDbUosaUNBSmIsQ0FqQ1U7QUF1Q2pCcEUsUUFBQUEsSUFBSSxFQUFFL0UsZUFBZSxDQUFDb0o7QUF2Q0wsT0FBckI7QUEwQ0EsVUFBTUMsY0FBYyxHQUFHO0FBQ25CLDZCQUFxQnZKLG9CQURGO0FBRW5CLHNDQUE4QnVCLGdCQUZYO0FBR25CLDBCQUFrQlYsaUJBSEM7QUFJbkIsMEJBQWtCa0IsaUJBSkM7QUFLbkIsOEJBQXNCTyxxQkFMSDtBQU1uQiwyQkFBbUJpQixrQkFOQTtBQU9uQiw2QkFBcUJPLG9CQVBGO0FBUW5CLG9CQUFZUyxXQVJPO0FBU25CLDZCQUFxQlksb0JBVEY7QUFVbkIseUJBQWlCa0IsZ0JBVkU7QUFXbkIsNEJBQW9CVyxtQkFYRDtBQVluQixxQkFBYW1CO0FBWk0sT0FBdkIsQ0F6VXNCLENBd1Z0Qjs7QUFDQXFCLE1BQUFBLGNBQWMsQ0FBQ3BMLFVBQWYsQ0FBMEJtTCxjQUExQjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSw0QkFBbUI7QUFDZixVQUFNRSxPQUFPLEdBQUdoTixDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QmlELEdBQXhCLEVBQWhCOztBQUVBLGNBQVErSixPQUFSO0FBQ0ksYUFBSyxVQUFMO0FBQ0ksaUJBQU8sS0FBS0MsZ0JBQUwsRUFBUDs7QUFDSixhQUFLLFNBQUw7QUFDSSxpQkFBTyxLQUFLQyxlQUFMLEVBQVA7O0FBQ0osYUFBSyxNQUFMO0FBQ0ksaUJBQU8sS0FBS0MsWUFBTCxFQUFQOztBQUNKO0FBQ0ksaUJBQU8sS0FBS0YsZ0JBQUwsRUFBUDtBQVJSO0FBVUg7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw0QkFBbUI7QUFDZixhQUFPO0FBQ0gzSSxRQUFBQSxXQUFXLEVBQUU7QUFDVDhJLFVBQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJc0wsWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDOEo7QUFGNUIsV0FERztBQUZFLFNBRFY7QUFVSC9LLFFBQUFBLElBQUksRUFBRTtBQUNGNEssVUFBQUEsVUFBVSxFQUFFLE1BRFY7QUFFRkMsVUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSXJMLFlBQUFBLElBQUksRUFBRSxPQURWO0FBRUlzTCxZQUFBQSxNQUFNLEVBQUU3SixlQUFlLENBQUMrSjtBQUY1QixXQURHO0FBRkwsU0FWSDtBQW1CSEMsUUFBQUEsUUFBUSxFQUFFO0FBQ05MLFVBQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJc0wsWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDaUs7QUFGNUIsV0FERztBQUZELFNBbkJQO0FBNEJIQyxRQUFBQSxNQUFNLEVBQUU7QUFDSlAsVUFBQUEsVUFBVSxFQUFFLFFBRFI7QUFFSlEsVUFBQUEsUUFBUSxFQUFFLElBRk47QUFHSlAsVUFBQUEsS0FBSyxFQUFFO0FBSEgsU0E1Qkw7QUFpQ0hRLFFBQUFBLElBQUksRUFBRTtBQUNGVCxVQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSXNMLFlBQUFBLE1BQU0sRUFBRTdKLGVBQWUsQ0FBQ3FLO0FBRjVCLFdBREcsRUFLSDtBQUNJOUwsWUFBQUEsSUFBSSxFQUFFLG1CQURWO0FBRUlzTCxZQUFBQSxNQUFNLEVBQUU3SixlQUFlLENBQUNzSztBQUY1QixXQUxHO0FBRkwsU0FqQ0g7QUE4Q0hDLFFBQUFBLGdCQUFnQixFQUFFO0FBQ2RaLFVBQUFBLFVBQVUsRUFBRSxpQkFERTtBQUVkUSxVQUFBQSxRQUFRLEVBQUUsSUFGSTtBQUdkUCxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSWlNLFlBQUFBLEtBQUssRUFBRSxLQUFLQyxtQkFGaEI7QUFHSVosWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDMEs7QUFINUIsV0FERztBQUhPO0FBOUNmLE9BQVA7QUEwREg7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwyQkFBa0I7QUFDZCxhQUFPO0FBQ0g3SixRQUFBQSxXQUFXLEVBQUU7QUFDVDhJLFVBQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJc0wsWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDOEo7QUFGNUIsV0FERztBQUZFLFNBRFY7QUFVSEUsUUFBQUEsUUFBUSxFQUFFO0FBQ05MLFVBQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJc0wsWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDaUs7QUFGNUIsV0FERztBQUZELFNBVlA7QUFtQkhDLFFBQUFBLE1BQU0sRUFBRTtBQUNKUCxVQUFBQSxVQUFVLEVBQUUsUUFEUjtBQUVKQyxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSXNMLFlBQUFBLE1BQU0sRUFBRTdKLGVBQWUsQ0FBQzJLO0FBRjVCLFdBREcsRUFLSDtBQUNJcE0sWUFBQUEsSUFBSSxFQUFFLGNBRFY7QUFFSXNMLFlBQUFBLE1BQU0sRUFBRTdKLGVBQWUsQ0FBQzRLO0FBRjVCLFdBTEc7QUFGSCxTQW5CTDtBQWdDSEwsUUFBQUEsZ0JBQWdCLEVBQUU7QUFDZFosVUFBQUEsVUFBVSxFQUFFLGlCQURFO0FBRWRRLFVBQUFBLFFBQVEsRUFBRSxJQUZJO0FBR2RQLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJaU0sWUFBQUEsS0FBSyxFQUFFLEtBQUtDLG1CQUZoQjtBQUdJWixZQUFBQSxNQUFNLEVBQUU3SixlQUFlLENBQUMwSztBQUg1QixXQURHO0FBSE87QUFoQ2YsT0FBUDtBQTRDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLHdCQUFlO0FBQ1gsYUFBTztBQUNIN0osUUFBQUEsV0FBVyxFQUFFO0FBQ1Q4SSxVQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSXNMLFlBQUFBLE1BQU0sRUFBRTdKLGVBQWUsQ0FBQzhKO0FBRjVCLFdBREc7QUFGRSxTQURWO0FBVUgvSyxRQUFBQSxJQUFJLEVBQUU7QUFDRjRLLFVBQUFBLFVBQVUsRUFBRSxNQURWO0FBRUZDLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyTCxZQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJc0wsWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDK0o7QUFGNUIsV0FERztBQUZMLFNBVkg7QUFtQkhLLFFBQUFBLElBQUksRUFBRTtBQUNGVCxVQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSXNMLFlBQUFBLE1BQU0sRUFBRTdKLGVBQWUsQ0FBQ3FLO0FBRjVCLFdBREcsRUFLSDtBQUNJOUwsWUFBQUEsSUFBSSxFQUFFLG1CQURWO0FBRUlzTCxZQUFBQSxNQUFNLEVBQUU3SixlQUFlLENBQUNzSztBQUY1QixXQUxHO0FBRkwsU0FuQkg7QUFnQ0hDLFFBQUFBLGdCQUFnQixFQUFFO0FBQ2RaLFVBQUFBLFVBQVUsRUFBRSxpQkFERTtBQUVkUSxVQUFBQSxRQUFRLEVBQUUsSUFGSTtBQUdkUCxVQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckwsWUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSWlNLFlBQUFBLEtBQUssRUFBRSxLQUFLQyxtQkFGaEI7QUFHSVosWUFBQUEsTUFBTSxFQUFFN0osZUFBZSxDQUFDMEs7QUFINUIsV0FERztBQUhPO0FBaENmLE9BQVA7QUE0Q0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSx5QkFBZ0JuQixPQUFoQixFQUF5QjtBQUNyQixVQUFNc0IsY0FBYyxHQUFHdE8sQ0FBQyxDQUFDLGdCQUFELENBQXhCOztBQUVBLFVBQUlnTixPQUFPLEtBQUssVUFBaEIsRUFBNEI7QUFDeEJzQixRQUFBQSxjQUFjLENBQUM1TCxJQUFmLENBQW9CZSxlQUFlLENBQUM4SywwQkFBaEIsSUFBOEMsNkJBQWxFO0FBQ0gsT0FGRCxNQUVPLElBQUl2QixPQUFPLEtBQUssTUFBaEIsRUFBd0I7QUFDM0JzQixRQUFBQSxjQUFjLENBQUM1TCxJQUFmLENBQW9CZSxlQUFlLENBQUMrSyx3QkFBaEIsSUFBNEMsMkJBQWhFO0FBQ0gsT0FQb0IsQ0FRckI7O0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxvQ0FBMkI7QUFDdkI7QUFDQSxVQUFNQyxNQUFNLEdBQUd6TyxDQUFDLENBQUMsU0FBRCxDQUFoQjtBQUNBLFVBQU0wTyxVQUFVLEdBQUcxTyxDQUFDLENBQUMsYUFBRCxDQUFwQjtBQUNBLFVBQU0yTyxRQUFRLEdBQUczTyxDQUFDLENBQUMsV0FBRCxDQUFsQjtBQUNBLFVBQU00TyxNQUFNLEdBQUc1TyxDQUFDLENBQUMsU0FBRCxDQUFoQjtBQUNBLFVBQU02TyxnQkFBZ0IsR0FBRzdPLENBQUMsQ0FBQyxvQkFBRCxDQUExQjtBQUNBLFVBQU04TyxlQUFlLEdBQUc5TyxDQUFDLENBQUMsa0JBQUQsQ0FBekI7QUFDQSxVQUFNZ04sT0FBTyxHQUFHaE4sQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JpRCxHQUF4QixFQUFoQjtBQUNBLFVBQU04TCxRQUFRLEdBQUcvTyxDQUFDLENBQUMsU0FBRCxDQUFsQjtBQUNBLFVBQU1nUCxXQUFXLEdBQUdoUCxDQUFDLENBQUMsd0JBQUQsQ0FBckI7QUFFQSxVQUFNaVAsV0FBVyxHQUFHalAsQ0FBQyxDQUFDLFdBQUQsQ0FBckI7QUFDQSxVQUFNa1AsU0FBUyxHQUFHLEtBQUtDLE9BQXZCLENBYnVCLENBZXZCOztBQUNBLFVBQUlGLFdBQVcsQ0FBQ2hNLEdBQVosT0FBc0I4TCxRQUFRLENBQUM5TCxHQUFULEVBQXRCLElBQXdDK0osT0FBTyxLQUFLLFNBQXhELEVBQW1FO0FBQy9EaUMsUUFBQUEsV0FBVyxDQUFDaE0sR0FBWixDQUFnQixFQUFoQjtBQUNIOztBQUNEZ00sTUFBQUEsV0FBVyxDQUFDRyxVQUFaLENBQXVCLFVBQXZCLEVBbkJ1QixDQXFCdkI7O0FBQ0EsV0FBS0MsbUJBQUwsR0F0QnVCLENBd0J2Qjs7QUFDQSxXQUFLQyxlQUFMLENBQXFCdEMsT0FBckIsRUF6QnVCLENBMkJ2Qjs7QUFDQSxVQUFJQSxPQUFPLEtBQUssVUFBaEIsRUFBNEI7QUFDeEJ5QixRQUFBQSxNQUFNLENBQUNjLElBQVA7QUFDQWIsUUFBQUEsVUFBVSxDQUFDYSxJQUFYO0FBQ0FaLFFBQUFBLFFBQVEsQ0FBQ1ksSUFBVDtBQUNBWCxRQUFBQSxNQUFNLENBQUNXLElBQVA7QUFDQVYsUUFBQUEsZ0JBQWdCLENBQUNVLElBQWpCO0FBQ0FULFFBQUFBLGVBQWUsQ0FBQ1UsSUFBaEIsR0FOd0IsQ0FNQTs7QUFDeEJ4UCxRQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQmlELEdBQXRCLENBQTBCLE1BQTFCLEVBUHdCLENBT1c7O0FBQ25DK0wsUUFBQUEsV0FBVyxDQUFDUSxJQUFaO0FBQ0gsT0FURCxNQVNPLElBQUl4QyxPQUFPLEtBQUssU0FBaEIsRUFBMkI7QUFDOUJpQyxRQUFBQSxXQUFXLENBQUNoTSxHQUFaLENBQWdCOEwsUUFBUSxDQUFDOUwsR0FBVCxFQUFoQjtBQUNBZ00sUUFBQUEsV0FBVyxDQUFDUSxJQUFaLENBQWlCLFVBQWpCLEVBQTZCLEVBQTdCLEVBRjhCLENBSTlCOztBQUNBLFlBQUlQLFNBQVMsQ0FBQ2pNLEdBQVYsR0FBZ0JOLElBQWhCLE9BQTJCLEVBQS9CLEVBQW1DO0FBQy9CLGVBQUsrTSxnQkFBTDtBQUNIOztBQUVEakIsUUFBQUEsTUFBTSxDQUFDZSxJQUFQO0FBQ0FkLFFBQUFBLFVBQVUsQ0FBQ2EsSUFBWDtBQUNBWixRQUFBQSxRQUFRLENBQUNZLElBQVQ7QUFDQVgsUUFBQUEsTUFBTSxDQUFDWSxJQUFQLEdBWjhCLENBWWY7O0FBQ2ZWLFFBQUFBLGVBQWUsQ0FBQ1MsSUFBaEIsR0FiOEIsQ0FhTjs7QUFDeEJQLFFBQUFBLFdBQVcsQ0FBQ08sSUFBWjtBQUNBVixRQUFBQSxnQkFBZ0IsQ0FBQ1csSUFBakIsR0FmOEIsQ0FnQjlCOztBQUNBLGFBQUs1TyxRQUFMLENBQWNtQixJQUFkLENBQW1CLGVBQW5CLEVBQW9DLE1BQXBDO0FBQ0EvQixRQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQVcyUCxPQUFYLENBQW1CLFFBQW5CLEVBQTZCdlAsV0FBN0IsQ0FBeUMsT0FBekM7QUFDQSxhQUFLUSxRQUFMLENBQWNtQixJQUFkLENBQW1CLGVBQW5CLEVBQW9DLE1BQXBDO0FBQ0EvQixRQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQVcyUCxPQUFYLENBQW1CLFFBQW5CLEVBQTZCdlAsV0FBN0IsQ0FBeUMsT0FBekMsRUFwQjhCLENBc0I5Qjs7QUFDQSxhQUFLd1AseUJBQUw7QUFDSCxPQXhCTSxNQXdCQSxJQUFJNUMsT0FBTyxLQUFLLE1BQWhCLEVBQXdCO0FBQzNCeUIsUUFBQUEsTUFBTSxDQUFDYyxJQUFQO0FBQ0FiLFFBQUFBLFVBQVUsQ0FBQ2EsSUFBWDtBQUNBWixRQUFBQSxRQUFRLENBQUNZLElBQVQ7QUFDQVgsUUFBQUEsTUFBTSxDQUFDVyxJQUFQO0FBQ0FWLFFBQUFBLGdCQUFnQixDQUFDVSxJQUFqQjtBQUNBVCxRQUFBQSxlQUFlLENBQUNTLElBQWhCLEdBTjJCLENBTUg7O0FBQ3hCUCxRQUFBQSxXQUFXLENBQUNRLElBQVosR0FQMkIsQ0FTM0I7O0FBQ0EsYUFBS0ssbUJBQUwsR0FWMkIsQ0FZM0I7O0FBQ0E3UCxRQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWVJLFdBQWYsQ0FBMkIsVUFBM0IsRUFiMkIsQ0FlM0I7O0FBQ0EsYUFBS1EsUUFBTCxDQUFjbUIsSUFBZCxDQUFtQixlQUFuQixFQUFvQyxVQUFwQztBQUNBLGFBQUtuQixRQUFMLENBQWNtQixJQUFkLENBQW1CLGVBQW5CLEVBQW9DLFFBQXBDLEVBakIyQixDQW1CM0I7O0FBQ0EsYUFBSzZOLHlCQUFMO0FBQ0gsT0FsRnNCLENBb0Z2Qjs7O0FBQ0EsVUFBTUUsRUFBRSxHQUFHOVAsQ0FBQyxDQUFDLGtCQUFELENBQVo7QUFDQSxVQUFNK1AsUUFBUSxHQUFHL1AsQ0FBQyxDQUFDLGNBQUQsQ0FBbEI7O0FBQ0EsVUFBSThQLEVBQUUsQ0FBQzVQLFFBQUgsQ0FBWSxZQUFaLENBQUosRUFBK0I7QUFDM0I2UCxRQUFBQSxRQUFRLENBQUNQLElBQVQ7QUFDQU8sUUFBQUEsUUFBUSxDQUFDM1AsV0FBVCxDQUFxQixTQUFyQjtBQUNILE9BSEQsTUFHTztBQUNIMlAsUUFBQUEsUUFBUSxDQUFDUixJQUFUO0FBQ0FRLFFBQUFBLFFBQVEsQ0FBQzFQLFFBQVQsQ0FBa0IsU0FBbEI7QUFDSDtBQUNKOzs7O0VBdndCcUIyUCxZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBUb29sdGlwQnVpbGRlciwgaTE4biAqL1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2Rpc2FibGVmcm9tdXNlciBpbnB1dCcpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggdmlzaWJpbGl0eSB1cGRhdGUgb24gb3BlblxuICAgICAgICB0aGlzLmluaXRpYWxpemVBY2NvcmRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ3Byb3ZpZGVycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdwcm92aWRlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBwcm9wZXIgYm9vbGVhbnNcbiAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnZGlzYWJsZWQnLCAncXVhbGlmeScsICdkaXNhYmxlZnJvbXVzZXInLCAnbm9yZWdpc3RlcicsICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCddO1xuICAgICAgICBib29sZWFuRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEuaGFzT3duUHJvcGVydHkoZmllbGQpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCB2YXJpb3VzIGNoZWNrYm94IHJlcHJlc2VudGF0aW9ucyB0byBib29sZWFuXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRdID0gcmVzdWx0LmRhdGFbZmllbGRdID09PSB0cnVlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJ3RydWUnIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJzEnIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gJ29uJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgYWRkaXRpb25hbCBob3N0cyBmb3IgU0lQIC0gY29sbGVjdCBmcm9tIHRhYmxlXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0ci5ob3N0LXJvdycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gJCh0aGlzKS5maW5kKCd0ZC5hZGRyZXNzJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzLnB1c2goe2FkZHJlc3M6IGhvc3R9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPbmx5IGFkZCBpZiB0aGVyZSBhcmUgaG9zdHNcbiAgICAgICAgaWYgKGFkZGl0aW9uYWxIb3N0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBhZGRpdGlvbmFsSG9zdHM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBzdXBlci5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS51bmlxaWQgJiYgISQoJyN1bmlxaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyN1bmlxaWQnKS52YWwocmVzcG9uc2UuZGF0YS51bmlxaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFjY29yZGlvbiB3aXRoIGN1c3RvbSBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwcyBpbiBmaXJld2FsbCBzdHlsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICAvLyBCdWlsZCB0b29sdGlwIGRhdGEgc3RydWN0dXJlc1xuICAgICAgICBjb25zdCByZWdpc3RyYXRpb25UeXBlRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbmV0d29ya0ZpbHRlckRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlY2VpdmVDYWxsc0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG91dGJvdW5kUHJveHlEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydFByb3RvY29sRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19zZWN1cml0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19wcm92aWRlclxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHF1YWxpZnlTZXNzaW9uRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZnJvbVJlZGVmaW5pdGlvbkRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzaXBQb3J0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdF92YWx1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjFfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG1hbnVhbEF0dHJpYnV0ZXNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICdjb250YWN0X3VzZXI9MjMxJyxcbiAgICAgICAgICAgICAgICAnZGlyZWN0X21lZGlhPW5vJyxcbiAgICAgICAgICAgICAgICAncnRwX3N5bW1ldHJpYz1ubycsXG4gICAgICAgICAgICAgICAgJ3RpbWVycz0xMCcsXG4gICAgICAgICAgICAgICAgJ21heF9yZXRyaWVzPTEwJyxcbiAgICAgICAgICAgICAgICAnJywgXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAncXVhbGlmeV9mcmVxdWVuY3k9NjAnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbcmVnaXN0cmF0aW9uXScsXG4gICAgICAgICAgICAgICAgJ3JldHJ5X2ludGVydmFsPTYwJyxcbiAgICAgICAgICAgICAgICAnbWF4X3JldHJpZXM9MTAnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcHJvdmlkZXJIb3N0RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9pZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nhc2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jbG91ZFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2RvbWFpblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGR0bWZNb2RlRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczMyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2l2cixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2NvbmYsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9mZWF0dXJlc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzY1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgJ3JlZ2lzdHJhdGlvbl90eXBlJzogcmVnaXN0cmF0aW9uVHlwZURhdGEsXG4gICAgICAgICAgICAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnOiByZWNlaXZlQ2FsbHNEYXRhLFxuICAgICAgICAgICAgJ25ldHdvcmtfZmlsdGVyJzogbmV0d29ya0ZpbHRlckRhdGEsXG4gICAgICAgICAgICAnb3V0Ym91bmRfcHJveHknOiBvdXRib3VuZFByb3h5RGF0YSxcbiAgICAgICAgICAgICd0cmFuc3BvcnRfcHJvdG9jb2wnOiB0cmFuc3BvcnRQcm90b2NvbERhdGEsXG4gICAgICAgICAgICAncXVhbGlmeV9zZXNzaW9uJzogcXVhbGlmeVNlc3Npb25EYXRhLFxuICAgICAgICAgICAgJ2Zyb21fcmVkZWZpbml0aW9uJzogZnJvbVJlZGVmaW5pdGlvbkRhdGEsXG4gICAgICAgICAgICAnc2lwX3BvcnQnOiBzaXBQb3J0RGF0YSxcbiAgICAgICAgICAgICdtYW51YWxfYXR0cmlidXRlcyc6IG1hbnVhbEF0dHJpYnV0ZXNEYXRhLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnOiBwcm92aWRlckhvc3REYXRhLFxuICAgICAgICAgICAgJ2FkZGl0aW9uYWxfaG9zdHMnOiBhZGRpdGlvbmFsSG9zdHNEYXRhLFxuICAgICAgICAgICAgJ2R0bWZfbW9kZSc6IGR0bWZNb2RlRGF0YVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyB1c2luZyBUb29sdGlwQnVpbGRlclxuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHJlZ1R5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ291dGJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdpbmJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vbmVSdWxlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpIHtcbiAgICAgICAgY29uc3QgJGhvc3RMYWJlbFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7IFxuICAgICAgICAvLyBHZXQgZWxlbWVudCByZWZlcmVuY2VzXG4gICAgICAgIGNvbnN0IGVsSG9zdCA9ICQoJyNlbEhvc3QnKTtcbiAgICAgICAgY29uc3QgZWxVc2VybmFtZSA9ICQoJyNlbFVzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IGVsU2VjcmV0ID0gJCgnI2VsU2VjcmV0Jyk7XG4gICAgICAgIGNvbnN0IGVsUG9ydCA9ICQoJyNlbFBvcnQnKTtcbiAgICAgICAgY29uc3QgZWxBZGRpdGlvbmFsSG9zdCA9ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpO1xuICAgICAgICBjb25zdCBlbE5ldHdvcmtGaWx0ZXIgPSAkKCcjZWxOZXR3b3JrRmlsdGVyJyk7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZWxVbmlxSWQgPSAkKCcjdW5pcWlkJyk7XG4gICAgICAgIGNvbnN0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGNvbnN0IHZhbFVzZXJOYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IHZhbFNlY3JldCA9IHRoaXMuJHNlY3JldDsgXG5cbiAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgb25seSB3aGVuIHN3aXRjaGluZyBmcm9tIGluYm91bmQgdG8gb3RoZXIgdHlwZXNcbiAgICAgICAgaWYgKHZhbFVzZXJOYW1lLnZhbCgpID09PSBlbFVuaXFJZC52YWwoKSAmJiByZWdUeXBlICE9PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcblxuICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgYnkgZGVmYXVsdFxuICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5oaWRlKCk7IC8vIE5ldHdvcmsgZmlsdGVyIG5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoJ25vbmUnKTsgLy8gUmVzZXQgdG8gZGVmYXVsdFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsSG9zdC5oaWRlKCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5oaWRlKCk7IC8vIFBvcnQgbm90IG5lZWRlZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBpbmJvdW5kIHNlY3VyaXR5XG4gICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LmhpZGUoKTsgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdob3N0Jyk7XG4gICAgICAgICAgICAkKCcjaG9zdCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3BvcnQnKTtcbiAgICAgICAgICAgICQoJyNwb3J0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbmV0d29yayBmaWx0ZXIgc3RhdGUgaWYgbmVlZGVkXG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBub25lIHR5cGUgKG5vIGF1dGgpXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgdG9vbHRpcCBpY29uIGZvciBwYXNzd29yZCBmaWVsZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCByZXF1aXJlbWVudHMgLSBtYWtlIHBhc3N3b3JkIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuICAgICAgICAgICAgJCgnI2VsU2VjcmV0JykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdHMgZm9yIG9wdGlvbmFsIGZpZWxkcyBpbiBub25lIG1vZGVcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICd1c2VybmFtZScpO1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG5ldHdvcmsgZmlsdGVyIHN0YXRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgdGhpcy5yZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIGNvbnN0IGVsID0gJCgnI2Rpc2FibGVmcm9tdXNlcicpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZnJvbVVzZXIuaGlkZSgpO1xuICAgICAgICAgICAgZnJvbVVzZXIucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLnNob3coKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG59Il19