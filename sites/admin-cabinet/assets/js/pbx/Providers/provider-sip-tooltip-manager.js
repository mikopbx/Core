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
        note: globalTranslate.pr_AdditionalHostsTooltip_important
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLXRvb2x0aXAtbWFuYWdlci5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJnZXRPdXRib3VuZFByb3h5VG9vbHRpcCIsImdldFRyYW5zcG9ydFByb3RvY29sVG9vbHRpcCIsImdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCIsImdldEZyb21SZWRlZmluaXRpb25Ub29sdGlwIiwiZ2V0U2lwUG9ydFRvb2x0aXAiLCJnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCIsImdldFByb3ZpZGVySG9zdFRvb2x0aXAiLCJnZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwIiwiZ2V0RHRtZk1vZGVUb29sdGlwIiwiZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwIiwiZ2V0RGlkU291cmNlVG9vbHRpcCIsImdldEN1c3RvbUhlYWRlclRvb2x0aXAiLCJnZXRQYXJzZXJSZWdleFRvb2x0aXAiLCJnZXRDYWxsZXJJZERpZERlYnVnVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlcyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHkiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlciIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIiLCJ3YXJuaW5nIiwidGV4dCIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmciLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWUiLCJwcl9TSVBQb3J0VG9vbHRpcF9zdGFuZGFyZF9wb3J0cyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnYiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnZfZGVzYyIsIm5vdGUiLCJwcl9TSVBQb3J0VG9vbHRpcF9ub3RlIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJsaXN0MyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfaWQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHkiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jYXNlcyIsImxpc3Q0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2xvdWQiLCJsaXN0NSIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0cyIsImxpc3Q2IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudCIsInByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9tb2Rlc19oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0byIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX3BpbiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfaGVhZGVyIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVmYXVsdCIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZnJvbSIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tX2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcnBpZCIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9ycGlkX2Rlc2MiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcGFpIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3BhaV9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2N1c3RvbSIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfaGVhZGVyIiwicHJfRGlkU291cmNlVG9vbHRpcF9kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF9kZWZhdWx0IiwicHJfRGlkU291cmNlVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX3RvIiwicHJfRGlkU291cmNlVG9vbHRpcF90b19kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF9kaXZlcnNpb24iLCJwcl9EaWRTb3VyY2VUb29sdGlwX2RpdmVyc2lvbl9kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF9jdXN0b20iLCJwcl9EaWRTb3VyY2VUb29sdGlwX2N1c3RvbV9kZXNjIiwicHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9oZWFkZXIiLCJwcl9DdXN0b21IZWFkZXJUb29sdGlwX2Rlc2MiLCJwcl9QYXJzZXJSZWdleFRvb2x0aXBfaGVhZGVyIiwicHJfUGFyc2VyUmVnZXhUb29sdGlwX2Rlc2MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9oZWFkZXIiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9kZXNjIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHVycG9zZSIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2VfZGVzYyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doYXRfbG9nZ2VkIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfb3JpZ2luYWxfdmFsdWVzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyX2NvbnRlbnQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9leHRyYWN0ZWRfdmFsdWVzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZmluYWxfdmFsdWVzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlcmVfdG9fZmluZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2FzdGVyaXNrX2NvbnNvbGUiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9zeXN0ZW1fbG9ncyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dlYl9pbnRlcmZhY2UiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGVuX3RvX3VzZSIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2NhbGxlcmlkIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd3JvbmdfZGlkIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfY3VzdG9tX2hlYWRlcnMiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wcm92aWRlcl90ZXN0aW5nIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2FybmluZyIsIlByb3ZpZGVyVG9vbHRpcE1hbmFnZXIiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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Iiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIC0gU3BlY2lhbGl6ZWQgdG9vbHRpcCBtYW5hZ2VtZW50IGZvciBTSVAgcHJvdmlkZXJzXG4gKiBcbiAqIFRoaXMgY2xhc3MgZXh0ZW5kcyB0aGUgYmFzZSBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHRvIHByb3ZpZGUgU0lQLXNwZWNpZmljXG4gKiB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLiBJdCBjb21iaW5lcyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcHMgd2l0aCBTSVAtc3BlY2lmaWNcbiAqIGZpZWxkIHRvb2x0aXBzIGZvciBjb21wcmVoZW5zaXZlIGZvcm0gZ3VpZGFuY2UuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBJbmhlcml0cyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gKiAtIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIChDYWxsZXJJRC9ESUQsIERUTUYsIHRyYW5zcG9ydCwgZXRjLilcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCBleGlzdGluZyBUb29sdGlwQnVpbGRlclxuICogLSBDb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nIGFuZCB2YWxpZGF0aW9uXG4gKiBcbiAqIEBjbGFzcyBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyXG4gKiBAZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIgZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIGFic3RyYWN0IG1ldGhvZCBmcm9tIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXJcbiAgICAgKiBhbmQgcHJvdmlkZXMgYWxsIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLlxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQcm92aWRlclNwZWNpZmljQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb3V0Ym91bmRfcHJveHknOiB0aGlzLmdldE91dGJvdW5kUHJveHlUb29sdGlwKCksXG4gICAgICAgICAgICAndHJhbnNwb3J0X3Byb3RvY29sJzogdGhpcy5nZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdxdWFsaWZ5X3Nlc3Npb24nOiB0aGlzLmdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2Zyb21fcmVkZWZpbml0aW9uJzogdGhpcy5nZXRGcm9tUmVkZWZpbml0aW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3NpcF9wb3J0JzogdGhpcy5nZXRTaXBQb3J0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ21hbnVhbF9hdHRyaWJ1dGVzJzogdGhpcy5nZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnOiB0aGlzLmdldFByb3ZpZGVySG9zdFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdhZGRpdGlvbmFsX2hvc3RzJzogdGhpcy5nZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwKCksXG4gICAgICAgICAgICAnZHRtZl9tb2RlJzogdGhpcy5nZXREdG1mTW9kZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdjaWRfc291cmNlJzogdGhpcy5nZXRDYWxsZXJJZFNvdXJjZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfc291cmNlJzogdGhpcy5nZXREaWRTb3VyY2VUb29sdGlwKCksXG4gICAgICAgICAgICAnY2lkX2N1c3RvbV9oZWFkZXInOiB0aGlzLmdldEN1c3RvbUhlYWRlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfY3VzdG9tX2hlYWRlcic6IHRoaXMuZ2V0Q3VzdG9tSGVhZGVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2RpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NhbGxlcmlkX2RpZF9kZWJ1Zyc6IHRoaXMuZ2V0Q2FsbGVySWREaWREZWJ1Z1Rvb2x0aXAoKVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IG91dGJvdW5kIHByb3h5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3Igb3V0Ym91bmQgcHJveHkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0T3V0Ym91bmRQcm94eVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRyYW5zcG9ydCBwcm90b2NvbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHRyYW5zcG9ydCBwcm90b2NvbCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVhbGlmeSBzZXNzaW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgcXVhbGlmeSBzZXNzaW9uIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGZyb20gcmVkZWZpbml0aW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgZnJvbSByZWRlZmluaXRpb24gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RnJvbVJlZGVmaW5pdGlvblRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHBvcnQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVAgcG9ydCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTaXBQb3J0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdF92YWx1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjFfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3J2LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3J2X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBtYW51YWwgYXR0cmlidXRlcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAnY29udGFjdF91c2VyPTIzMScsXG4gICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgJ3J0cF9zeW1tZXRyaWM9bm8nLFxuICAgICAgICAgICAgICAgICd0aW1lcnM9MTAnLFxuICAgICAgICAgICAgICAgICdtYXhfcmV0cmllcz0xMCcsXG4gICAgICAgICAgICAgICAgJycsIFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbYW9yXScsXG4gICAgICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcXVlbmN5PTYwJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAnW3JlZ2lzdHJhdGlvbl0nLFxuICAgICAgICAgICAgICAgICdyZXRyeV9pbnRlcnZhbD02MCcsXG4gICAgICAgICAgICAgICAgJ21heF9yZXRyaWVzPTEwJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpY19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBwcm92aWRlciBob3N0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgcHJvdmlkZXIgaG9zdCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQcm92aWRlckhvc3RUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhZGRpdGlvbmFsIGhvc3RzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgYWRkaXRpb25hbCBob3N0cyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9pZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2Vfc2VjdXJpdHlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nhc2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfYmFja3VwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9jbG91ZFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdF9zdWJuZXQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2RvbWFpblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2ltcG9ydGFudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBEVE1GIG1vZGUgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBEVE1GIG1vZGUgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RHRtZk1vZGVUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX21vZGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaXZyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfcGluLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfY29uZixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2ZlYXR1cmVzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IENhbGxlcklEIHNvdXJjZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIENhbGxlcklEIHNvdXJjZSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRDYWxsZXJJZFNvdXJjZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Zyb21fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcnBpZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcGFpLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3BhaV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfY3VzdG9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2N1c3RvbV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1JvaXN0YXQ6IHgtcm9pc3RhdC1waG9uZScsXG4gICAgICAgICAgICAgICAgJ01hbmdvOiBEaXZlcnNpb24nXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IERJRCBzb3VyY2UgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBESUQgc291cmNlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldERpZFNvdXJjZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX3RvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF90b19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2RpdmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VzdG9tIGhlYWRlciB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIGN1c3RvbSBoZWFkZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0Q3VzdG9tSGVhZGVyVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0N1c3RvbUhlYWRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXN0b21IZWFkZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdYLUNhbGxlci1JRCcsXG4gICAgICAgICAgICAgICAgJ1gtT3JpZ2luYWwtTnVtYmVyJyxcbiAgICAgICAgICAgICAgICAneC1yb2lzdGF0LXBob25lJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBwYXJzZXIgcmVnZXggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBwYXJzZXIgcmVnZXggZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UGFyc2VyUmVnZXhUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUGFyc2VyUmVnZXhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUGFyc2VyUmVnZXhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbMC05XSsgLSBkaWdpdHMgb25seScsXG4gICAgICAgICAgICAgICAgJ1srXT9bMC05XSsgLSBkaWdpdHMgd2l0aCBvcHRpb25hbCArJyxcbiAgICAgICAgICAgICAgICAnWzAtOV17NywxNX0gLSA3IHRvIDE1IGRpZ2l0cydcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ2FsbGVySUQvRElEIGRlYnVnIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQ2FsbGVySUQvRElEIGRlYnVnIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldENhbGxlcklkRGlkRGVidWdUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doYXRfbG9nZ2VkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX29yaWdpbmFsX3ZhbHVlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyX2NvbnRlbnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2V4dHJhY3RlZF92YWx1ZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2ZpbmFsX3ZhbHVlc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlcmVfdG9fZmluZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9hc3Rlcmlza19jb25zb2xlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9zeXN0ZW1fbG9ncyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2ViX2ludGVyZmFjZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlbl90b191c2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd3JvbmdfY2FsbGVyaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2RpZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfY3VzdG9tX2hlYWRlcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3Byb3ZpZGVyX3Rlc3RpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyO1xufSJdfQ==