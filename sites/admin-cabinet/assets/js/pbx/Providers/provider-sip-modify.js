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

/* global globalRootUrl, globalTranslate, Form, ProviderBase */

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
        'registration_type': this.buildTooltipContent(registrationTypeData),
        'receive_calls_without_auth': this.buildTooltipContent(receiveCallsData),
        'network_filter': this.buildTooltipContent(networkFilterData),
        'outbound_proxy': this.buildTooltipContent(outboundProxyData),
        'transport_protocol': this.buildTooltipContent(transportProtocolData),
        'qualify_session': this.buildTooltipContent(qualifySessionData),
        'from_redefinition': this.buildTooltipContent(fromRedefinitionData),
        'sip_port': this.buildTooltipContent(sipPortData),
        'manual_attributes': this.buildTooltipContent(manualAttributesData),
        'provider_host': this.buildTooltipContent(providerHostData),
        'additional_hosts': this.buildTooltipContent(additionalHostsData),
        'dtmf_mode': this.buildTooltipContent(dtmfModeData)
      }; // Initialize tooltips for each field with info icon

      $('.field-info-icon').each(function (_, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var content = tooltipConfigs[fieldName];

        if (content) {
          $icon.popup({
            html: content,
            position: 'top right',
            hoverable: true,
            delay: {
              show: 300,
              hide: 100
            },
            variation: 'flowing'
          });
        }
      });
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

      valUserName.removeAttr('readonly'); // Hide any existing password info messages

      this.hidePasswordInfoMessage(); // Update host label based on registration type

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
        $('#port').closest('.field').removeClass('error');
      } else if (regType === 'none') {
        elHost.show();
        elUsername.show();
        elSecret.show();
        elPort.show();
        elAdditionalHost.show();
        elNetworkFilter.show(); // Network filter critical for none type (no auth)

        genPassword.hide(); // Show informational message for password field

        this.showPasswordInfoMessage('sip'); // Update field requirements - make password optional in none mode

        $('#elSecret').removeClass('required'); // Remove validation prompts for optional fields in none mode

        this.$formObj.form('remove prompt', 'username');
        this.$formObj.form('remove prompt', 'secret');
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
}(ProviderBase); // Initialize on document ready


$(document).ready(function () {
  var provider = new ProviderSIP();
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQWNjb3JkaW9uIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJzZWxmIiwiJGFjY29yZGlvbnMiLCJhY2NvcmRpb24iLCJvbk9wZW4iLCJzZXRUaW1lb3V0IiwicmVnaXN0cmF0aW9uVHlwZURhdGEiLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsIm5ldHdvcmtGaWx0ZXJEYXRhIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmUiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lX2Rlc2MiLCJyZWNlaXZlQ2FsbHNEYXRhIiwicHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlciIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjIiwid2FybmluZyIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJwcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZyIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbiIsInByX1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwib3V0Ym91bmRQcm94eURhdGEiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2UiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZV9kZXNjIiwidHJhbnNwb3J0UHJvdG9jb2xEYXRhIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlciIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Byb3RvY29sc19oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHMiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImxpc3QyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5IiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19zZWN1cml0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXIiLCJxdWFsaWZ5U2Vzc2lvbkRhdGEiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzYyIsImZyb21SZWRlZmluaXRpb25EYXRhIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfd2FybmluZyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW4iLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9kb21haW5fZGVzYyIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzYyIsInNpcFBvcnREYXRhIiwicHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHQiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0X3ZhbHVlIiwicHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MSIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjIiwibm90ZSIsInByX1NJUFBvcnRUb29sdGlwX25vdGUiLCJtYW51YWxBdHRyaWJ1dGVzRGF0YSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwibGlzdDMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcm92aWRlckhvc3REYXRhIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmQiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZSIsImFkZGl0aW9uYWxIb3N0c0RhdGEiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyIsImxpc3Q0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWQiLCJsaXN0NSIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyIsImxpc3Q2IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudCIsImR0bWZNb2RlRGF0YSIsInByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0byIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJ0b29sdGlwQ29uZmlncyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJlYWNoIiwiXyIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJjb250ZW50IiwicG9wdXAiLCJodG1sIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJoaWRlIiwidmFyaWF0aW9uIiwicmVnVHlwZSIsInZhbCIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsIm9wdGlvbmFsIiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJhZGRpdGlvbmFsX2hvc3RzIiwidmFsdWUiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsQWRkaXRpb25hbEhvc3QiLCJlbE5ldHdvcmtGaWx0ZXIiLCJlbFVuaXFJZCIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCIkc2VjcmV0IiwicmVtb3ZlQXR0ciIsImhpZGVQYXNzd29yZEluZm9NZXNzYWdlIiwidXBkYXRlSG9zdExhYmVsIiwiYXR0ciIsInRyaW0iLCJnZW5lcmF0ZVBhc3N3b3JkIiwiJGZvcm1PYmoiLCJmb3JtIiwiY2xvc2VzdCIsInNob3dQYXNzd29yZEluZm9NZXNzYWdlIiwiZWwiLCJmcm9tVXNlciIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciIsImluaXRpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQTs7QUFDViw4QkFBTSxLQUFOO0FBQ0EsVUFBS0MsY0FBTCxHQUFzQkMsQ0FBQyxDQUFDLFVBQUQsQ0FBdkI7QUFDQSxVQUFLQyxrQkFBTCxHQUEwQkQsQ0FBQyxDQUFDLGVBQUQsQ0FBM0I7QUFIVTtBQUliO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS0QsY0FBTCxDQUFvQkcsUUFBcEIsQ0FBNkI7QUFDekJDLFFBQUFBLFFBQVEsRUFBRSxvQkFBTTtBQUNaLGNBQUksTUFBSSxDQUFDSixjQUFMLENBQW9CRyxRQUFwQixDQUE2QixZQUE3QixDQUFKLEVBQWdEO0FBQzVDLFlBQUEsTUFBSSxDQUFDRCxrQkFBTCxDQUF3QkcsV0FBeEIsQ0FBb0MsVUFBcEM7QUFDSCxXQUZELE1BRU87QUFDSCxZQUFBLE1BQUksQ0FBQ0gsa0JBQUwsQ0FBd0JJLFFBQXhCLENBQWlDLFVBQWpDO0FBQ0g7QUFDSjtBQVB3QixPQUE3QjtBQVVBTCxNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0Qk0sRUFBNUIsQ0FBK0IsUUFBL0IsRUFBeUMsWUFBTTtBQUMzQyxRQUFBLE1BQUksQ0FBQ0Msd0JBQUw7O0FBQ0FDLFFBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILE9BSEQsRUFkUyxDQW1CVDs7QUFDQSxXQUFL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LGNBQUQsQ0FBbEI7O0FBQ0EsVUFBSTJPLEVBQUUsQ0FBQ3pPLFFBQUgsQ0FBWSxZQUFaLENBQUosRUFBK0I7QUFDM0IwTyxRQUFBQSxRQUFRLENBQUNwRCxJQUFUO0FBQ0FvRCxRQUFBQSxRQUFRLENBQUN4TyxXQUFULENBQXFCLFNBQXJCO0FBQ0gsT0FIRCxNQUdPO0FBQ0h3TyxRQUFBQSxRQUFRLENBQUNyRCxJQUFUO0FBQ0FxRCxRQUFBQSxRQUFRLENBQUN2TyxRQUFULENBQWtCLFNBQWxCO0FBQ0g7QUFDSjs7OztFQW5zQnFCd08sWSxHQXNzQjFCOzs7QUFDQTdPLENBQUMsQ0FBQzhPLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIsTUFBTUMsUUFBUSxHQUFHLElBQUlsUCxXQUFKLEVBQWpCO0FBQ0FrUCxFQUFBQSxRQUFRLENBQUNDLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlICovXG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpOyBcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZGlzYWJsZWZyb211c2VyIGlucHV0Jykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCB2aXNpYmlsaXR5IHVwZGF0ZSBvbiBvcGVuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjdXN0b20gY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHMgaW4gZmlyZXdhbGwgc3R5bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBvdXRib3VuZFByb3h5RGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9mb3JtYXRfZXhhbXBsZXNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0cmFuc3BvcnRQcm90b2NvbERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBxdWFsaWZ5U2Vzc2lvbkRhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGZyb21SZWRlZmluaXRpb25EYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2lwUG9ydERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3N0YW5kYXJkX3BvcnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBtYW51YWxBdHRyaWJ1dGVzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAnY29udGFjdF91c2VyPTIzMScsXG4gICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgJ3J0cF9zeW1tZXRyaWM9bm8nLFxuICAgICAgICAgICAgICAgICd0aW1lcnM9MTAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCcsXG4gICAgICAgICAgICAgICAgJycsIFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbYW9yXScsXG4gICAgICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcXVlbmN5PTYwJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnW3JlZ2lzdHJhdGlvbl0nLFxuICAgICAgICAgICAgICAgICdyZXRyeV9pbnRlcnZhbD02MCcsXG4gICAgICAgICAgICAgICAgJ21heF9yZXRyaWVzPTEwJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpY19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySG9zdERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9tdWx0aSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9nZW8sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnRcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkdG1mTW9kZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfZmVhdHVyZXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgICdyZWdpc3RyYXRpb25fdHlwZSc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChyZWdpc3RyYXRpb25UeXBlRGF0YSksXG4gICAgICAgICAgICAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQocmVjZWl2ZUNhbGxzRGF0YSksXG4gICAgICAgICAgICAnbmV0d29ya19maWx0ZXInOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQobmV0d29ya0ZpbHRlckRhdGEpLFxuICAgICAgICAgICAgJ291dGJvdW5kX3Byb3h5JzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KG91dGJvdW5kUHJveHlEYXRhKSxcbiAgICAgICAgICAgICd0cmFuc3BvcnRfcHJvdG9jb2wnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQodHJhbnNwb3J0UHJvdG9jb2xEYXRhKSxcbiAgICAgICAgICAgICdxdWFsaWZ5X3Nlc3Npb24nOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQocXVhbGlmeVNlc3Npb25EYXRhKSxcbiAgICAgICAgICAgICdmcm9tX3JlZGVmaW5pdGlvbic6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChmcm9tUmVkZWZpbml0aW9uRGF0YSksXG4gICAgICAgICAgICAnc2lwX3BvcnQnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoc2lwUG9ydERhdGEpLFxuICAgICAgICAgICAgJ21hbnVhbF9hdHRyaWJ1dGVzJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KG1hbnVhbEF0dHJpYnV0ZXNEYXRhKSxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHByb3ZpZGVySG9zdERhdGEpLFxuICAgICAgICAgICAgJ2FkZGl0aW9uYWxfaG9zdHMnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoYWRkaXRpb25hbEhvc3RzRGF0YSksXG4gICAgICAgICAgICAnZHRtZl9tb2RlJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KGR0bWZNb2RlRGF0YSlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGVhY2ggZmllbGQgd2l0aCBpbmZvIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKF8sIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldEluYm91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHsgXG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgZWxIb3N0ID0gJCgnI2VsSG9zdCcpO1xuICAgICAgICBjb25zdCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgZWxQb3J0ID0gJCgnI2VsUG9ydCcpO1xuICAgICAgICBjb25zdCBlbEFkZGl0aW9uYWxIb3N0ID0gJCgnI2VsQWRkaXRpb25hbEhvc3RzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyk7XG5cbiAgICAgICAgY29uc3QgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdmFsU2VjcmV0ID0gdGhpcy4kc2VjcmV0OyBcblxuICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBvbmx5IHdoZW4gc3dpdGNoaW5nIGZyb20gaW5ib3VuZCB0byBvdGhlciB0eXBlc1xuICAgICAgICBpZiAodmFsVXNlck5hbWUudmFsKCkgPT09IGVsVW5pcUlkLnZhbCgpICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIEhpZGUgYW55IGV4aXN0aW5nIHBhc3N3b3JkIGluZm8gbWVzc2FnZXNcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRJbmZvTWVzc2FnZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0TGFiZWwocmVnVHlwZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnbm9uZScpOyAvLyBSZXNldCB0byBkZWZhdWx0XG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTsgLy8gUG9ydCBub3QgbmVlZGVkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgY3JpdGljYWwgZm9yIGluYm91bmQgc2VjdXJpdHlcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3QuaGlkZSgpOyBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIGVycm9ycyBmb3IgaGlkZGVuIGZpZWxkc1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuICAgICAgICAgICAgJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBub25lIHR5cGUgKG5vIGF1dGgpXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgaW5mb3JtYXRpb25hbCBtZXNzYWdlIGZvciBwYXNzd29yZCBmaWVsZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRJbmZvTWVzc2FnZSgnc2lwJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCByZXF1aXJlbWVudHMgLSBtYWtlIHBhc3N3b3JkIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuICAgICAgICAgICAgJCgnI2VsU2VjcmV0JykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdHMgZm9yIG9wdGlvbmFsIGZpZWxkcyBpbiBub25lIG1vZGVcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICd1c2VybmFtZScpO1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICBjb25zdCBlbCA9ICQoJyNkaXNhYmxlZnJvbXVzZXInKTtcbiAgICAgICAgY29uc3QgZnJvbVVzZXIgPSAkKCcjZGl2RnJvbVVzZXInKTtcbiAgICAgICAgaWYgKGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXJTSVAoKTtcbiAgICBwcm92aWRlci5pbml0aWFsaXplKCk7XG59KTsiXX0=