"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalTranslate, TooltipBuilder, ProviderTooltipManager */

/**
 * ProviderSipTooltipManager - Specialized tooltip management for SIP providers
 * 
 * This class extends the base ProviderTooltipManager to provide SIP-specific
 * tooltip configurations. It combines common provider tooltips with SIP-specific
 * field tooltips for comprehensive form guidance.
 * 
 * Features:
 * - Inherits common provider tooltip functionality
 * - SIP-specific tooltip configurations (CallerID/DID, DTMF, transport, etc.)
 * - Integration with existing TooltipBuilder
 * - Consistent error handling and validation
 * 
 * @class ProviderSipTooltipManager
 * @extends ProviderTooltipManager
 */
var ProviderSipTooltipManager = /*#__PURE__*/function (_ProviderTooltipManag) {
  _inherits(ProviderSipTooltipManager, _ProviderTooltipManag);

  var _super = _createSuper(ProviderSipTooltipManager);

  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function ProviderSipTooltipManager() {
    var _this;

    _classCallCheck(this, ProviderSipTooltipManager);

    _this = _super.call(this);
    throw new Error('ProviderSipTooltipManager is a static class and cannot be instantiated');
    return _this;
  }
  /**
   * Get SIP-specific tooltip configurations
   * 
   * This method implements the abstract method from ProviderTooltipManager
   * and provides all SIP-specific tooltip configurations.
   * 
   * @static
   * @returns {Object} SIP-specific tooltip configurations
   */


  _createClass(ProviderSipTooltipManager, null, [{
    key: "getProviderSpecificConfigurations",
    value: function getProviderSpecificConfigurations() {
      return {
        'outbound_proxy': this.getOutboundProxyTooltip(),
        'transport_protocol': this.getTransportProtocolTooltip(),
        'qualify_session': this.getQualifySessionTooltip(),
        'from_redefinition': this.getFromRedefinitionTooltip(),
        'sip_port': this.getSipPortTooltip(),
        'manual_attributes': this.getManualAttributesTooltip(),
        'provider_host': this.getProviderHostTooltip(),
        'additional_hosts': this.getAdditionalHostsTooltip(),
        'dtmf_mode': this.getDtmfModeTooltip(),
        'cid_source': this.getCallerIdSourceTooltip(),
        'did_source': this.getDidSourceTooltip(),
        'cid_custom_header': this.getCustomHeaderTooltip(),
        'did_custom_header': this.getCustomHeaderTooltip(),
        'cid_parser_regex': this.getParserRegexTooltip(),
        'did_parser_regex': this.getParserRegexTooltip(),
        'callerid_did_debug': this.getCallerIdDidDebugTooltip()
      };
    }
    /**
     * Get outbound proxy tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for outbound proxy field
     */

  }, {
    key: "getOutboundProxyTooltip",
    value: function getOutboundProxyTooltip() {
      return {
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
    }
    /**
     * Get transport protocol tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for transport protocol field
     */

  }, {
    key: "getTransportProtocolTooltip",
    value: function getTransportProtocolTooltip() {
      return {
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
    }
    /**
     * Get qualify session tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for qualify session field
     */

  }, {
    key: "getQualifySessionTooltip",
    value: function getQualifySessionTooltip() {
      return {
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
    }
    /**
     * Get from redefinition tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for from redefinition field
     */

  }, {
    key: "getFromRedefinitionTooltip",
    value: function getFromRedefinitionTooltip() {
      return {
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
    }
    /**
     * Get SIP port tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SIP port field
     */

  }, {
    key: "getSipPortTooltip",
    value: function getSipPortTooltip() {
      return {
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
        }, {
          term: globalTranslate.pr_SIPPortTooltip_srv,
          definition: globalTranslate.pr_SIPPortTooltip_srv_desc
        }],
        note: globalTranslate.pr_SIPPortTooltip_note
      };
    }
    /**
     * Get manual attributes tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for manual attributes field
     */

  }, {
    key: "getManualAttributesTooltip",
    value: function getManualAttributesTooltip() {
      return {
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
        examples: ['[endpoint]', 'contact_user=231', 'direct_media=no', 'rtp_symmetric=no', 'timers=10', 'max_retries=10', 'set_var=LEGACY_CP1251=1', '', '', '[aor]', 'qualify_frequency=60', '', '', '[registration]', 'retry_interval=60', 'max_retries=10'],
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
        }, {
          term: globalTranslate.pr_ManualAttributesTooltip_set_var,
          definition: globalTranslate.pr_ManualAttributesTooltip_set_var_desc
        }],
        note: globalTranslate.pr_ManualAttributesTooltip_warning
      };
    }
    /**
     * Get provider host tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for provider host field
     */

  }, {
    key: "getProviderHostTooltip",
    value: function getProviderHostTooltip() {
      return {
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
    }
    /**
     * Get additional hosts tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for additional hosts field
     */

  }, {
    key: "getAdditionalHostsTooltip",
    value: function getAdditionalHostsTooltip() {
      return {
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
        note: globalTranslate.pr_AdditionalHostsTooltip_important,
        warning: {
          text: globalTranslate.pr_AdditionalHostsTooltip_trust
        }
      };
    }
    /**
     * Get DTMF mode tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for DTMF mode field
     */

  }, {
    key: "getDtmfModeTooltip",
    value: function getDtmfModeTooltip() {
      return {
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
    }
    /**
     * Get CallerID source tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for CallerID source field
     */

  }, {
    key: "getCallerIdSourceTooltip",
    value: function getCallerIdSourceTooltip() {
      return {
        header: globalTranslate.pr_CallerIdSourceTooltip_header,
        description: globalTranslate.pr_CallerIdSourceTooltip_desc,
        list: [{
          term: globalTranslate.pr_CallerIdSourceTooltip_default,
          definition: globalTranslate.pr_CallerIdSourceTooltip_default_desc
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_from,
          definition: globalTranslate.pr_CallerIdSourceTooltip_from_desc
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_rpid,
          definition: globalTranslate.pr_CallerIdSourceTooltip_rpid_desc
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_pai,
          definition: globalTranslate.pr_CallerIdSourceTooltip_pai_desc
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_custom,
          definition: globalTranslate.pr_CallerIdSourceTooltip_custom_desc
        }],
        examples: ['Roistat: x-roistat-phone', 'Mango: Diversion']
      };
    }
    /**
     * Get DID source tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for DID source field
     */

  }, {
    key: "getDidSourceTooltip",
    value: function getDidSourceTooltip() {
      return {
        header: globalTranslate.pr_DidSourceTooltip_header,
        description: globalTranslate.pr_DidSourceTooltip_desc,
        list: [{
          term: globalTranslate.pr_DidSourceTooltip_default,
          definition: globalTranslate.pr_DidSourceTooltip_default_desc
        }, {
          term: globalTranslate.pr_DidSourceTooltip_to,
          definition: globalTranslate.pr_DidSourceTooltip_to_desc
        }, {
          term: globalTranslate.pr_DidSourceTooltip_diversion,
          definition: globalTranslate.pr_DidSourceTooltip_diversion_desc
        }, {
          term: globalTranslate.pr_DidSourceTooltip_custom,
          definition: globalTranslate.pr_DidSourceTooltip_custom_desc
        }]
      };
    }
    /**
     * Get custom header tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for custom header field
     */

  }, {
    key: "getCustomHeaderTooltip",
    value: function getCustomHeaderTooltip() {
      return {
        header: globalTranslate.pr_CustomHeaderTooltip_header,
        description: globalTranslate.pr_CustomHeaderTooltip_desc,
        examples: ['X-Caller-ID', 'X-Original-Number', 'x-roistat-phone']
      };
    }
    /**
     * Get parser regex tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for parser regex field
     */

  }, {
    key: "getParserRegexTooltip",
    value: function getParserRegexTooltip() {
      return {
        header: globalTranslate.pr_ParserRegexTooltip_header,
        description: globalTranslate.pr_ParserRegexTooltip_desc,
        examples: ['[0-9]+ - digits only', '[+]?[0-9]+ - digits with optional +', '[0-9]{7,15} - 7 to 15 digits']
      };
    }
    /**
     * Get CallerID/DID debug tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for CallerID/DID debug field
     */

  }, {
    key: "getCallerIdDidDebugTooltip",
    value: function getCallerIdDidDebugTooltip() {
      return {
        header: globalTranslate.pr_CallerIdDidDebugTooltip_header,
        description: globalTranslate.pr_CallerIdDidDebugTooltip_desc,
        list: [{
          term: globalTranslate.pr_CallerIdDidDebugTooltip_purpose,
          definition: globalTranslate.pr_CallerIdDidDebugTooltip_purpose_desc
        }, {
          term: globalTranslate.pr_CallerIdDidDebugTooltip_what_logged,
          definition: null
        }],
        list2: [globalTranslate.pr_CallerIdDidDebugTooltip_original_values, globalTranslate.pr_CallerIdDidDebugTooltip_header_content, globalTranslate.pr_CallerIdDidDebugTooltip_extracted_values, globalTranslate.pr_CallerIdDidDebugTooltip_final_values],
        list3: [{
          term: globalTranslate.pr_CallerIdDidDebugTooltip_where_to_find,
          definition: null
        }],
        list4: [globalTranslate.pr_CallerIdDidDebugTooltip_asterisk_console, globalTranslate.pr_CallerIdDidDebugTooltip_system_logs, globalTranslate.pr_CallerIdDidDebugTooltip_web_interface],
        list5: [{
          term: globalTranslate.pr_CallerIdDidDebugTooltip_when_to_use,
          definition: null
        }],
        list6: [globalTranslate.pr_CallerIdDidDebugTooltip_wrong_callerid, globalTranslate.pr_CallerIdDidDebugTooltip_wrong_did, globalTranslate.pr_CallerIdDidDebugTooltip_custom_headers, globalTranslate.pr_CallerIdDidDebugTooltip_provider_testing],
        warning: {
          text: globalTranslate.pr_CallerIdDidDebugTooltip_warning
        }
      };
    }
  }]);

  return ProviderSipTooltipManager;
}(ProviderTooltipManager); // Export for use in other modules


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderSipTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLXRvb2x0aXAtbWFuYWdlci5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJnZXRPdXRib3VuZFByb3h5VG9vbHRpcCIsImdldFRyYW5zcG9ydFByb3RvY29sVG9vbHRpcCIsImdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCIsImdldEZyb21SZWRlZmluaXRpb25Ub29sdGlwIiwiZ2V0U2lwUG9ydFRvb2x0aXAiLCJnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCIsImdldFByb3ZpZGVySG9zdFRvb2x0aXAiLCJnZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwIiwiZ2V0RHRtZk1vZGVUb29sdGlwIiwiZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwIiwiZ2V0RGlkU291cmNlVG9vbHRpcCIsImdldEN1c3RvbUhlYWRlclRvb2x0aXAiLCJnZXRQYXJzZXJSZWdleFRvb2x0aXAiLCJnZXRDYWxsZXJJZERpZERlYnVnVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlcyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHkiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlciIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIiLCJ3YXJuaW5nIiwidGV4dCIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmciLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWUiLCJwcl9TSVBQb3J0VG9vbHRpcF9zdGFuZGFyZF9wb3J0cyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnYiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnZfZGVzYyIsIm5vdGUiLCJwcl9TSVBQb3J0VG9vbHRpcF9ub3RlIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJsaXN0MyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2V0X3ZhciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3NldF92YXJfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZSIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMiLCJsaXN0NCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkIiwibGlzdDUiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMiLCJsaXN0NiIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3RydXN0IiwicHJfRFRNRk1vZGVUb29sdGlwX2hlYWRlciIsInByX0RUTUZNb2RlVG9vbHRpcF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX21vZGVzX2hlYWRlciIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmQiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mbyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmZvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczMyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2hlYWRlciIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9pdnIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfcGluIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2NvbmYiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfZmVhdHVyZXMiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9oZWFkZXIiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0IiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2RlZmF1bHRfZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Zyb21fZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9ycGlkIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWRfZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWkiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcGFpX2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfY3VzdG9tIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2N1c3RvbV9kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF9oZWFkZXIiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2RlZmF1bHQiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2RlZmF1bHRfZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfdG8iLCJwcl9EaWRTb3VyY2VUb29sdGlwX3RvX2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2RpdmVyc2lvbiIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uX2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2N1c3RvbSIsInByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2MiLCJwcl9DdXN0b21IZWFkZXJUb29sdGlwX2hlYWRlciIsInByX0N1c3RvbUhlYWRlclRvb2x0aXBfZGVzYyIsInByX1BhcnNlclJlZ2V4VG9vbHRpcF9oZWFkZXIiLCJwcl9QYXJzZXJSZWdleFRvb2x0aXBfZGVzYyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2hlYWRlciIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2Rlc2MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hhdF9sb2dnZWQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9vcmlnaW5hbF92YWx1ZXMiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9oZWFkZXJfY29udGVudCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2V4dHJhY3RlZF92YWx1ZXMiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9maW5hbF92YWx1ZXMiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGVyZV90b19maW5kIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfYXN0ZXJpc2tfY29uc29sZSIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3N5c3RlbV9sb2dzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2ViX2ludGVyZmFjZSIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doZW5fdG9fdXNlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd3JvbmdfY2FsbGVyaWQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93cm9uZ19kaWQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9jdXN0b21faGVhZGVycyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3Byb3ZpZGVyX3Rlc3RpbmciLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93YXJuaW5nIiwiUHJvdmlkZXJUb29sdGlwTWFuYWdlciIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FB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SG5LLGVBQWUsQ0FBQ29LLG9DQUZiLEVBR0hwSyxlQUFlLENBQUNxSyx5Q0FIYixFQUlIckssZUFBZSxDQUFDc0ssMkNBSmIsQ0FwQ0o7QUEwQ0hwSSxRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFbkMsZUFBZSxDQUFDdUs7QUFEakI7QUExQ04sT0FBUDtBQThDSDs7OztFQTdqQm1DQyxzQixHQWlrQnhDOzs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjNMLHlCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIC0gU3BlY2lhbGl6ZWQgdG9vbHRpcCBtYW5hZ2VtZW50IGZvciBTSVAgcHJvdmlkZXJzXG4gKiBcbiAqIFRoaXMgY2xhc3MgZXh0ZW5kcyB0aGUgYmFzZSBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHRvIHByb3ZpZGUgU0lQLXNwZWNpZmljXG4gKiB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLiBJdCBjb21iaW5lcyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcHMgd2l0aCBTSVAtc3BlY2lmaWNcbiAqIGZpZWxkIHRvb2x0aXBzIGZvciBjb21wcmVoZW5zaXZlIGZvcm0gZ3VpZGFuY2UuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBJbmhlcml0cyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gKiAtIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIChDYWxsZXJJRC9ESUQsIERUTUYsIHRyYW5zcG9ydCwgZXRjLilcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCBleGlzdGluZyBUb29sdGlwQnVpbGRlclxuICogLSBDb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nIGFuZCB2YWxpZGF0aW9uXG4gKiBcbiAqIEBjbGFzcyBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyXG4gKiBAZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIgZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIGFic3RyYWN0IG1ldGhvZCBmcm9tIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXJcbiAgICAgKiBhbmQgcHJvdmlkZXMgYWxsIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLlxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQcm92aWRlclNwZWNpZmljQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb3V0Ym91bmRfcHJveHknOiB0aGlzLmdldE91dGJvdW5kUHJveHlUb29sdGlwKCksXG4gICAgICAgICAgICAndHJhbnNwb3J0X3Byb3RvY29sJzogdGhpcy5nZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdxdWFsaWZ5X3Nlc3Npb24nOiB0aGlzLmdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2Zyb21fcmVkZWZpbml0aW9uJzogdGhpcy5nZXRGcm9tUmVkZWZpbml0aW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3NpcF9wb3J0JzogdGhpcy5nZXRTaXBQb3J0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ21hbnVhbF9hdHRyaWJ1dGVzJzogdGhpcy5nZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnOiB0aGlzLmdldFByb3ZpZGVySG9zdFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdhZGRpdGlvbmFsX2hvc3RzJzogdGhpcy5nZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwKCksXG4gICAgICAgICAgICAnZHRtZl9tb2RlJzogdGhpcy5nZXREdG1mTW9kZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdjaWRfc291cmNlJzogdGhpcy5nZXRDYWxsZXJJZFNvdXJjZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfc291cmNlJzogdGhpcy5nZXREaWRTb3VyY2VUb29sdGlwKCksXG4gICAgICAgICAgICAnY2lkX2N1c3RvbV9oZWFkZXInOiB0aGlzLmdldEN1c3RvbUhlYWRlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfY3VzdG9tX2hlYWRlcic6IHRoaXMuZ2V0Q3VzdG9tSGVhZGVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2RpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NhbGxlcmlkX2RpZF9kZWJ1Zyc6IHRoaXMuZ2V0Q2FsbGVySWREaWREZWJ1Z1Rvb2x0aXAoKVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IG91dGJvdW5kIHByb3h5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3Igb3V0Ym91bmQgcHJveHkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0T3V0Ym91bmRQcm94eVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRyYW5zcG9ydCBwcm90b2NvbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHRyYW5zcG9ydCBwcm90b2NvbCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVhbGlmeSBzZXNzaW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgcXVhbGlmeSBzZXNzaW9uIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGZyb20gcmVkZWZpbml0aW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgZnJvbSByZWRlZmluaXRpb24gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RnJvbVJlZGVmaW5pdGlvblRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHBvcnQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVAgcG9ydCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTaXBQb3J0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdF92YWx1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjFfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3J2LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3J2X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBtYW51YWwgYXR0cmlidXRlcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAnY29udGFjdF91c2VyPTIzMScsXG4gICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgJ3J0cF9zeW1tZXRyaWM9bm8nLFxuICAgICAgICAgICAgICAgICd0aW1lcnM9MTAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCcsXG4gICAgICAgICAgICAgICAgJ3NldF92YXI9TEVHQUNZX0NQMTI1MT0xJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnW2Fvcl0nLFxuICAgICAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXF1ZW5jeT02MCcsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJ1tyZWdpc3RyYXRpb25dJyxcbiAgICAgICAgICAgICAgICAncmV0cnlfaW50ZXJ2YWw9NjAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbnRhY3RfdXNlcl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpYyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdGltZXJzX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3NldF92YXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9zZXRfdmFyX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvdmlkZXIgaG9zdCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHByb3ZpZGVyIGhvc3QgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UHJvdmlkZXJIb3N0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWRkaXRpb25hbCBob3N0cyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIGFkZGl0aW9uYWwgaG9zdHMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QWRkaXRpb25hbEhvc3RzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9tdWx0aSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9nZW8sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW5cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnQsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdHJ1c3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgRFRNRiBtb2RlIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgRFRNRiBtb2RlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldER0bWZNb2RlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczMyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2l2cixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2NvbmYsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9mZWF0dXJlc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzY1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDYWxsZXJJRCBzb3VyY2UgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBDYWxsZXJJRCBzb3VyY2UgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9ycGlkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3BhaSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWlfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2N1c3RvbSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdSb2lzdGF0OiB4LXJvaXN0YXQtcGhvbmUnLFxuICAgICAgICAgICAgICAgICdNYW5nbzogRGl2ZXJzaW9uJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBESUQgc291cmNlIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgRElEIHNvdXJjZSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXREaWRTb3VyY2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF90byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfdG9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kaXZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2RpdmVyc2lvbl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2N1c3RvbSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1c3RvbSBoZWFkZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBjdXN0b20gaGVhZGVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEN1c3RvbUhlYWRlclRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXN0b21IZWFkZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnWC1DYWxsZXItSUQnLFxuICAgICAgICAgICAgICAgICdYLU9yaWdpbmFsLU51bWJlcicsXG4gICAgICAgICAgICAgICAgJ3gtcm9pc3RhdC1waG9uZSdcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGFyc2VyIHJlZ2V4IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgcGFyc2VyIHJlZ2V4IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBhcnNlclJlZ2V4VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1BhcnNlclJlZ2V4VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1BhcnNlclJlZ2V4VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnWzAtOV0rIC0gZGlnaXRzIG9ubHknLFxuICAgICAgICAgICAgICAgICdbK10/WzAtOV0rIC0gZGlnaXRzIHdpdGggb3B0aW9uYWwgKycsXG4gICAgICAgICAgICAgICAgJ1swLTldezcsMTV9IC0gNyB0byAxNSBkaWdpdHMnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IENhbGxlcklEL0RJRCBkZWJ1ZyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIENhbGxlcklEL0RJRCBkZWJ1ZyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRDYWxsZXJJZERpZERlYnVnVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHVycG9zZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGF0X2xvZ2dlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9vcmlnaW5hbF92YWx1ZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2hlYWRlcl9jb250ZW50LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9leHRyYWN0ZWRfdmFsdWVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9maW5hbF92YWx1ZXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doZXJlX3RvX2ZpbmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfYXN0ZXJpc2tfY29uc29sZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfc3lzdGVtX2xvZ3MsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dlYl9pbnRlcmZhY2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doZW5fdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2NhbGxlcmlkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93cm9uZ19kaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2N1c3RvbV9oZWFkZXJzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wcm92aWRlcl90ZXN0aW5nXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlcjtcbn0iXX0=