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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLXRvb2x0aXAtbWFuYWdlci5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJnZXRPdXRib3VuZFByb3h5VG9vbHRpcCIsImdldFRyYW5zcG9ydFByb3RvY29sVG9vbHRpcCIsImdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCIsImdldEZyb21SZWRlZmluaXRpb25Ub29sdGlwIiwiZ2V0U2lwUG9ydFRvb2x0aXAiLCJnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCIsImdldFByb3ZpZGVySG9zdFRvb2x0aXAiLCJnZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwIiwiZ2V0RHRtZk1vZGVUb29sdGlwIiwiZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwIiwiZ2V0RGlkU291cmNlVG9vbHRpcCIsImdldEN1c3RvbUhlYWRlclRvb2x0aXAiLCJnZXRQYXJzZXJSZWdleFRvb2x0aXAiLCJnZXRDYWxsZXJJZERpZERlYnVnVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlcyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHkiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlciIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIiLCJ3YXJuaW5nIiwidGV4dCIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmciLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWUiLCJwcl9TSVBQb3J0VG9vbHRpcF9zdGFuZGFyZF9wb3J0cyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnYiLCJwcl9TSVBQb3J0VG9vbHRpcF9zcnZfZGVzYyIsIm5vdGUiLCJwcl9TSVBQb3J0VG9vbHRpcF9ub3RlIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJsaXN0MyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdF9tZWRpYV9kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcnRwX3N5bW1ldHJpYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2V0X3ZhciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3NldF92YXJfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZSIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMiLCJsaXN0NCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkIiwibGlzdDUiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMiLCJsaXN0NiIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnQiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZCIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmZvIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2l2ciIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4iLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfY29uZiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9mZWF0dXJlcyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2hlYWRlciIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2RlZmF1bHQiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Zyb20iLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZnJvbV9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWQiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcnBpZF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3BhaSIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWlfZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b20iLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2hlYWRlciIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdCIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF90byIsInByX0RpZFNvdXJjZVRvb2x0aXBfdG9fZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uIiwicHJfRGlkU291cmNlVG9vbHRpcF9kaXZlcnNpb25fZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tIiwicHJfRGlkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzYyIsInByX0N1c3RvbUhlYWRlclRvb2x0aXBfaGVhZGVyIiwicHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9kZXNjIiwicHJfUGFyc2VyUmVnZXhUb29sdGlwX2hlYWRlciIsInByX1BhcnNlclJlZ2V4VG9vbHRpcF9kZXNjIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZGVzYyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2UiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGF0X2xvZ2dlZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX29yaWdpbmFsX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2hlYWRlcl9jb250ZW50IiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZXh0cmFjdGVkX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2ZpbmFsX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doZXJlX3RvX2ZpbmQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9hc3Rlcmlza19jb25zb2xlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfc3lzdGVtX2xvZ3MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93ZWJfaW50ZXJmYWNlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlbl90b191c2UiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93cm9uZ19jYWxsZXJpZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2RpZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2N1c3RvbV9oZWFkZXJzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHJvdmlkZXJfdGVzdGluZyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dhcm5pbmciLCJQcm92aWRlclRvb2x0aXBNYW5hZ2VyIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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LFVBQUFBLElBQUksRUFBRW5DLGVBQWUsQ0FBQ3NLO0FBRGpCO0FBMUNOLE9BQVA7QUE4Q0g7Ozs7RUExakJtQ0Msc0IsR0E4akJ4Qzs7O0FBQ0EsSUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUIxTCx5QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyICovXG5cbi8qKlxuICogUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciAtIFNwZWNpYWxpemVkIHRvb2x0aXAgbWFuYWdlbWVudCBmb3IgU0lQIHByb3ZpZGVyc1xuICogXG4gKiBUaGlzIGNsYXNzIGV4dGVuZHMgdGhlIGJhc2UgUHJvdmlkZXJUb29sdGlwTWFuYWdlciB0byBwcm92aWRlIFNJUC1zcGVjaWZpY1xuICogdG9vbHRpcCBjb25maWd1cmF0aW9ucy4gSXQgY29tYmluZXMgY29tbW9uIHByb3ZpZGVyIHRvb2x0aXBzIHdpdGggU0lQLXNwZWNpZmljXG4gKiBmaWVsZCB0b29sdGlwcyBmb3IgY29tcHJlaGVuc2l2ZSBmb3JtIGd1aWRhbmNlLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gSW5oZXJpdHMgY29tbW9uIHByb3ZpZGVyIHRvb2x0aXAgZnVuY3Rpb25hbGl0eVxuICogLSBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyAoQ2FsbGVySUQvRElELCBEVE1GLCB0cmFuc3BvcnQsIGV0Yy4pXG4gKiAtIEludGVncmF0aW9uIHdpdGggZXhpc3RpbmcgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gQ29uc2lzdGVudCBlcnJvciBoYW5kbGluZyBhbmQgdmFsaWRhdGlvblxuICogXG4gKiBAY2xhc3MgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlclxuICogQGV4dGVuZHMgUHJvdmlkZXJUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIGV4dGVuZHMgUHJvdmlkZXJUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQLXNwZWNpZmljIHRvb2x0aXAgY29uZmlndXJhdGlvbnNcbiAgICAgKiBcbiAgICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBhYnN0cmFjdCBtZXRob2QgZnJvbSBQcm92aWRlclRvb2x0aXBNYW5hZ2VyXG4gICAgICogYW5kIHByb3ZpZGVzIGFsbCBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9ucy5cbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gU0lQLXNwZWNpZmljIHRvb2x0aXAgY29uZmlndXJhdGlvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UHJvdmlkZXJTcGVjaWZpY0NvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ291dGJvdW5kX3Byb3h5JzogdGhpcy5nZXRPdXRib3VuZFByb3h5VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3RyYW5zcG9ydF9wcm90b2NvbCc6IHRoaXMuZ2V0VHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwKCksXG4gICAgICAgICAgICAncXVhbGlmeV9zZXNzaW9uJzogdGhpcy5nZXRRdWFsaWZ5U2Vzc2lvblRvb2x0aXAoKSxcbiAgICAgICAgICAgICdmcm9tX3JlZGVmaW5pdGlvbic6IHRoaXMuZ2V0RnJvbVJlZGVmaW5pdGlvblRvb2x0aXAoKSxcbiAgICAgICAgICAgICdzaXBfcG9ydCc6IHRoaXMuZ2V0U2lwUG9ydFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdtYW51YWxfYXR0cmlidXRlcyc6IHRoaXMuZ2V0TWFudWFsQXR0cmlidXRlc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JzogdGhpcy5nZXRQcm92aWRlckhvc3RUb29sdGlwKCksXG4gICAgICAgICAgICAnYWRkaXRpb25hbF9ob3N0cyc6IHRoaXMuZ2V0QWRkaXRpb25hbEhvc3RzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2R0bWZfbW9kZSc6IHRoaXMuZ2V0RHRtZk1vZGVUb29sdGlwKCksXG4gICAgICAgICAgICAnY2lkX3NvdXJjZSc6IHRoaXMuZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwKCksXG4gICAgICAgICAgICAnZGlkX3NvdXJjZSc6IHRoaXMuZ2V0RGlkU291cmNlVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NpZF9jdXN0b21faGVhZGVyJzogdGhpcy5nZXRDdXN0b21IZWFkZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnZGlkX2N1c3RvbV9oZWFkZXInOiB0aGlzLmdldEN1c3RvbUhlYWRlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdjaWRfcGFyc2VyX3JlZ2V4JzogdGhpcy5nZXRQYXJzZXJSZWdleFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfcGFyc2VyX3JlZ2V4JzogdGhpcy5nZXRQYXJzZXJSZWdleFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdjYWxsZXJpZF9kaWRfZGVidWcnOiB0aGlzLmdldENhbGxlcklkRGlkRGVidWdUb29sdGlwKClcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCBvdXRib3VuZCBwcm94eSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIG91dGJvdW5kIHByb3h5IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldE91dGJvdW5kUHJveHlUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0cmFuc3BvcnQgcHJvdG9jb2wgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciB0cmFuc3BvcnQgcHJvdG9jb2wgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Byb3RvY29sc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RscyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHNfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1YWxpZnkgc2Vzc2lvbiB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHF1YWxpZnkgc2Vzc2lvbiBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRRdWFsaWZ5U2Vzc2lvblRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBmcm9tIHJlZGVmaW5pdGlvbiB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIGZyb20gcmVkZWZpbml0aW9uIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEZyb21SZWRlZmluaXRpb25Ub29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX2RvbWFpbl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUCBwb3J0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU0lQIHBvcnQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U2lwUG9ydFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3N0YW5kYXJkX3BvcnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjAsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3NydixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3Nydl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hbnVhbCBhdHRyaWJ1dGVzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgbWFudWFsIGF0dHJpYnV0ZXMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFudWFsQXR0cmlidXRlc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnW2VuZHBvaW50XScsXG4gICAgICAgICAgICAgICAgJ2NvbnRhY3RfdXNlcj0yMzEnLFxuICAgICAgICAgICAgICAgICdkaXJlY3RfbWVkaWE9bm8nLFxuICAgICAgICAgICAgICAgICdydHBfc3ltbWV0cmljPW5vJyxcbiAgICAgICAgICAgICAgICAndGltZXJzPTEwJyxcbiAgICAgICAgICAgICAgICAnbWF4X3JldHJpZXM9MTAnLFxuICAgICAgICAgICAgICAgICdzZXRfdmFyPUxFR0FDWV9DUDEyNTE9MScsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAncXVhbGlmeV9mcmVxdWVuY3k9NjAnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbcmVnaXN0cmF0aW9uXScsXG4gICAgICAgICAgICAgICAgJ3JldHJ5X2ludGVydmFsPTYwJyxcbiAgICAgICAgICAgICAgICAnbWF4X3JldHJpZXM9MTAnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9zZXRfdmFyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2V0X3Zhcl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHByb3ZpZGVyIGhvc3QgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBwcm92aWRlciBob3N0IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFByb3ZpZGVySG9zdFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFkZGl0aW9uYWwgaG9zdHMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBhZGRpdGlvbmFsIGhvc3RzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFkZGl0aW9uYWxIb3N0c1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9zZWN1cml0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9iYWNrdXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X3N1Ym5ldCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaW1wb3J0YW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IERUTUYgbW9kZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIERUTUYgbW9kZSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXREdG1mTW9kZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfZmVhdHVyZXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ2FsbGVySUQgc291cmNlIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQ2FsbGVySUQgc291cmNlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldENhbGxlcklkU291cmNlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Zyb20sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZnJvbV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcnBpZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9ycGlkX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcGFpX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b20sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnUm9pc3RhdDogeC1yb2lzdGF0LXBob25lJyxcbiAgICAgICAgICAgICAgICAnTWFuZ286IERpdmVyc2lvbidcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgRElEIHNvdXJjZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIERJRCBzb3VyY2UgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RGlkU291cmNlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfdG8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX3RvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kaXZlcnNpb25fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9jdXN0b20sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2N1c3RvbV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXN0b20gaGVhZGVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgY3VzdG9tIGhlYWRlciBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRDdXN0b21IZWFkZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0N1c3RvbUhlYWRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1gtQ2FsbGVyLUlEJyxcbiAgICAgICAgICAgICAgICAnWC1PcmlnaW5hbC1OdW1iZXInLFxuICAgICAgICAgICAgICAgICd4LXJvaXN0YXQtcGhvbmUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhcnNlciByZWdleCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHBhcnNlciByZWdleCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQYXJzZXJSZWdleFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QYXJzZXJSZWdleFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9QYXJzZXJSZWdleFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1swLTldKyAtIGRpZ2l0cyBvbmx5JyxcbiAgICAgICAgICAgICAgICAnWytdP1swLTldKyAtIGRpZ2l0cyB3aXRoIG9wdGlvbmFsICsnLFxuICAgICAgICAgICAgICAgICdbMC05XXs3LDE1fSAtIDcgdG8gMTUgZGlnaXRzJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDYWxsZXJJRC9ESUQgZGVidWcgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBDYWxsZXJJRC9ESUQgZGVidWcgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0Q2FsbGVySWREaWREZWJ1Z1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hhdF9sb2dnZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfb3JpZ2luYWxfdmFsdWVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9oZWFkZXJfY29udGVudCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZXh0cmFjdGVkX3ZhbHVlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZmluYWxfdmFsdWVzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGVyZV90b19maW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2FzdGVyaXNrX2NvbnNvbGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3N5c3RlbV9sb2dzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93ZWJfaW50ZXJmYWNlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGVuX3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93cm9uZ19jYWxsZXJpZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd3JvbmdfZGlkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9jdXN0b21faGVhZGVycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHJvdmlkZXJfdGVzdGluZ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXI7XG59Il19