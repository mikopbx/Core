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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQWNjb3JkaW9uIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJzZWxmIiwiJGFjY29yZGlvbnMiLCJhY2NvcmRpb24iLCJvbk9wZW4iLCJzZXRUaW1lb3V0IiwicmVnaXN0cmF0aW9uVHlwZURhdGEiLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsIm5ldHdvcmtGaWx0ZXJEYXRhIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmUiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2MiLCJyZWNlaXZlQ2FsbHNEYXRhIiwicHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlciIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjIiwid2FybmluZyIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZyIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwib3V0Ym91bmRQcm94eURhdGEiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2UiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZV9kZXNjIiwidHJhbnNwb3J0UHJvdG9jb2xEYXRhIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlciIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Byb3RvY29sc19oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHMiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImxpc3QyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5IiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19zZWN1cml0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXIiLCJxdWFsaWZ5U2Vzc2lvbkRhdGEiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzYyIsImZyb21SZWRlZmluaXRpb25EYXRhIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfd2FybmluZyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW4iLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW5fZGVzYyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzYyIsInNpcFBvcnREYXRhIiwicHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHQiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0X3ZhbHVlIiwicHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MSIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjIiwibm90ZSIsInByX1NJUFBvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRGF0YSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwibGlzdDMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcm92aWRlckhvc3REYXRhIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmQiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZSIsImFkZGl0aW9uYWxIb3N0c0RhdGEiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyIsImxpc3Q0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWQiLCJsaXN0NSIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyIsImxpc3Q2IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudCIsImR0bWZNb2RlRGF0YSIsInByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0byIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJ0b29sdGlwQ29uZmlncyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsInJlZ1R5cGUiLCJ2YWwiLCJnZXRPdXRib3VuZFJ1bGVzIiwiZ2V0SW5ib3VuZFJ1bGVzIiwiZ2V0Tm9uZVJ1bGVzIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwiaG9zdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsInZhbHVlIiwiaG9zdElucHV0VmFsaWRhdGlvbiIsInByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsIiRob3N0TGFiZWxUZXh0IiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJlbEhvc3QiLCJlbFVzZXJuYW1lIiwiZWxTZWNyZXQiLCJlbFBvcnQiLCJlbEFkZGl0aW9uYWxIb3N0IiwiZWxOZXR3b3JrRmlsdGVyIiwiZWxVbmlxSWQiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwiJHNlY3JldCIsInJlbW92ZUF0dHIiLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwidXBkYXRlSG9zdExhYmVsIiwic2hvdyIsImhpZGUiLCJhdHRyIiwidHJpbSIsImdlbmVyYXRlUGFzc3dvcmQiLCIkZm9ybU9iaiIsImZvcm0iLCJjbG9zZXN0IiwicmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJlbCIsImZyb21Vc2VyIiwiUHJvdmlkZXJCYXNlIl0sIm1hcHBpbmdzIjoi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QUFNaU8sUUFBUSxHQUFHak8sQ0FBQyxDQUFDLGNBQUQsQ0FBbEI7O0FBQ0EsVUFBSWdPLEVBQUUsQ0FBQzlOLFFBQUgsQ0FBWSxZQUFaLENBQUosRUFBK0I7QUFDM0IrTixRQUFBQSxRQUFRLENBQUNWLElBQVQ7QUFDQVUsUUFBQUEsUUFBUSxDQUFDN04sV0FBVCxDQUFxQixTQUFyQjtBQUNILE9BSEQsTUFHTztBQUNINk4sUUFBQUEsUUFBUSxDQUFDWCxJQUFUO0FBQ0FXLFFBQUFBLFFBQVEsQ0FBQzVOLFFBQVQsQ0FBa0IsU0FBbEI7QUFDSDtBQUNKOzs7O0VBeHJCcUI2TixZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBUb29sdGlwQnVpbGRlciwgaTE4biAqL1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2Rpc2FibGVmcm9tdXNlciBpbnB1dCcpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggdmlzaWJpbGl0eSB1cGRhdGUgb24gb3BlblxuICAgICAgICB0aGlzLmluaXRpYWxpemVBY2NvcmRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggY3VzdG9tIGNhbGxiYWNrc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2NvcmRpb24oKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zLmFjY29yZGlvbih7XG4gICAgICAgICAgICBvbk9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IHdoZW4gYWNjb3JkaW9uIG9wZW5zXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzIGluIGZpcmV3YWxsIHN0eWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgZGF0YSBzdHJ1Y3R1cmVzXG4gICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblR5cGVEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBuZXR3b3JrRmlsdGVyRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgb3V0Ym91bmRQcm94eURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdHJhbnNwb3J0UHJvdG9jb2xEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Byb3RvY29sc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RscyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcXVhbGlmeVNlc3Npb25EYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBmcm9tUmVkZWZpbml0aW9uRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW4sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW5fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHNpcFBvcnREYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0X3ZhbHVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9zdGFuZGFyZF9wb3J0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYwX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbWFudWFsQXR0cmlidXRlc0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnW2VuZHBvaW50XScsXG4gICAgICAgICAgICAgICAgJ2NvbnRhY3RfdXNlcj0yMzEnLFxuICAgICAgICAgICAgICAgICdkaXJlY3RfbWVkaWE9bm8nLFxuICAgICAgICAgICAgICAgICdydHBfc3ltbWV0cmljPW5vJyxcbiAgICAgICAgICAgICAgICAndGltZXJzPTEwJyxcbiAgICAgICAgICAgICAgICAnbWF4X3JldHJpZXM9MTAnLFxuICAgICAgICAgICAgICAgICcnLCBcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnW2Fvcl0nLFxuICAgICAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXF1ZW5jeT02MCcsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJ1tyZWdpc3RyYXRpb25dJyxcbiAgICAgICAgICAgICAgICAncmV0cnlfaW50ZXJ2YWw9NjAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlcl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpYyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwcm92aWRlckhvc3REYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0c0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9zZWN1cml0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9iYWNrdXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X3N1Ym5ldCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaW1wb3J0YW50XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZHRtZk1vZGVEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX21vZGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfcGluLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfY29uZixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICAncmVnaXN0cmF0aW9uX3R5cGUnOiByZWdpc3RyYXRpb25UeXBlRGF0YSxcbiAgICAgICAgICAgICdyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCc6IHJlY2VpdmVDYWxsc0RhdGEsXG4gICAgICAgICAgICAnbmV0d29ya19maWx0ZXInOiBuZXR3b3JrRmlsdGVyRGF0YSxcbiAgICAgICAgICAgICdvdXRib3VuZF9wcm94eSc6IG91dGJvdW5kUHJveHlEYXRhLFxuICAgICAgICAgICAgJ3RyYW5zcG9ydF9wcm90b2NvbCc6IHRyYW5zcG9ydFByb3RvY29sRGF0YSxcbiAgICAgICAgICAgICdxdWFsaWZ5X3Nlc3Npb24nOiBxdWFsaWZ5U2Vzc2lvbkRhdGEsXG4gICAgICAgICAgICAnZnJvbV9yZWRlZmluaXRpb24nOiBmcm9tUmVkZWZpbml0aW9uRGF0YSxcbiAgICAgICAgICAgICdzaXBfcG9ydCc6IHNpcFBvcnREYXRhLFxuICAgICAgICAgICAgJ21hbnVhbF9hdHRyaWJ1dGVzJzogbWFudWFsQXR0cmlidXRlc0RhdGEsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCc6IHByb3ZpZGVySG9zdERhdGEsXG4gICAgICAgICAgICAnYWRkaXRpb25hbF9ob3N0cyc6IGFkZGl0aW9uYWxIb3N0c0RhdGEsXG4gICAgICAgICAgICAnZHRtZl9tb2RlJzogZHRtZk1vZGVEYXRhXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldEluYm91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHsgXG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgZWxIb3N0ID0gJCgnI2VsSG9zdCcpO1xuICAgICAgICBjb25zdCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgZWxQb3J0ID0gJCgnI2VsUG9ydCcpO1xuICAgICAgICBjb25zdCBlbEFkZGl0aW9uYWxIb3N0ID0gJCgnI2VsQWRkaXRpb25hbEhvc3RzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyk7XG5cbiAgICAgICAgY29uc3QgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdmFsU2VjcmV0ID0gdGhpcy4kc2VjcmV0OyBcblxuICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBvbmx5IHdoZW4gc3dpdGNoaW5nIGZyb20gaW5ib3VuZCB0byBvdGhlciB0eXBlc1xuICAgICAgICBpZiAodmFsVXNlck5hbWUudmFsKCkgPT09IGVsVW5pcUlkLnZhbCgpICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIEhpZGUgcGFzc3dvcmQgdG9vbHRpcCBieSBkZWZhdWx0XG4gICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0TGFiZWwocmVnVHlwZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnbm9uZScpOyAvLyBSZXNldCB0byBkZWZhdWx0XG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTsgLy8gUG9ydCBub3QgbmVlZGVkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgY3JpdGljYWwgZm9yIGluYm91bmQgc2VjdXJpdHlcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3QuaGlkZSgpOyBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIGVycm9ycyBmb3IgaGlkZGVuIGZpZWxkc1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuICAgICAgICAgICAgJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBuZXR3b3JrIGZpbHRlciBzdGF0ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgY3JpdGljYWwgZm9yIG5vbmUgdHlwZSAobm8gYXV0aClcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyB0b29sdGlwIGljb24gZm9yIHBhc3N3b3JkIGZpZWxkXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHJlcXVpcmVtZW50cyAtIG1ha2UgcGFzc3dvcmQgb3B0aW9uYWwgaW4gbm9uZSBtb2RlXG4gICAgICAgICAgICAkKCcjZWxTZWNyZXQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcHJvbXB0cyBmb3Igb3B0aW9uYWwgZmllbGRzIGluIG5vbmUgbW9kZVxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3VzZXJuYW1lJyk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbmV0d29yayBmaWx0ZXIgc3RhdGUgaWYgbmVlZGVkXG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVOZXR3b3JrRmlsdGVyU3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gJ2Rpc2FibGVmcm9tdXNlcicgY2hlY2tib3hcbiAgICAgICAgY29uc3QgZWwgPSAkKCcjZGlzYWJsZWZyb211c2VyJyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=