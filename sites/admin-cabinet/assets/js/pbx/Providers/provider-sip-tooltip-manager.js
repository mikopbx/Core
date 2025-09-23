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
        header: globalTranslate.pr_CallerIdSourceTooltip_header || 'CallerID Source',
        description: globalTranslate.pr_CallerIdSourceTooltip_desc || 'Select the SIP header to extract the caller ID from',
        list: [{
          term: globalTranslate.pr_CallerIdSourceTooltip_default || 'Default',
          definition: globalTranslate.pr_CallerIdSourceTooltip_default_desc || 'Use standard Asterisk logic'
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_from || 'FROM',
          definition: globalTranslate.pr_CallerIdSourceTooltip_from_desc || 'Extract from FROM header'
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_rpid || 'Remote-Party-ID',
          definition: globalTranslate.pr_CallerIdSourceTooltip_rpid_desc || 'Extract from Remote-Party-ID header'
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_pai || 'P-Asserted-Identity',
          definition: globalTranslate.pr_CallerIdSourceTooltip_pai_desc || 'Extract from P-Asserted-Identity header'
        }, {
          term: globalTranslate.pr_CallerIdSourceTooltip_custom || 'Custom',
          definition: globalTranslate.pr_CallerIdSourceTooltip_custom_desc || 'Extract from a custom header'
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
        header: globalTranslate.pr_DidSourceTooltip_header || 'DID Source',
        description: globalTranslate.pr_DidSourceTooltip_desc || 'Select how to determine the dialed number',
        list: [{
          term: globalTranslate.pr_DidSourceTooltip_default || 'Default',
          definition: globalTranslate.pr_DidSourceTooltip_default_desc || 'Use Request-URI'
        }, {
          term: globalTranslate.pr_DidSourceTooltip_to || 'TO',
          definition: globalTranslate.pr_DidSourceTooltip_to_desc || 'Extract from TO header'
        }, {
          term: globalTranslate.pr_DidSourceTooltip_diversion || 'Diversion',
          definition: globalTranslate.pr_DidSourceTooltip_diversion_desc || 'For forwarded calls'
        }, {
          term: globalTranslate.pr_DidSourceTooltip_custom || 'Custom',
          definition: globalTranslate.pr_DidSourceTooltip_custom_desc || 'Extract from a custom header'
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
        header: globalTranslate.pr_CustomHeaderTooltip_header || 'Custom Header Name',
        description: globalTranslate.pr_CustomHeaderTooltip_desc || 'Specify the exact SIP header name',
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
        header: globalTranslate.pr_ParserRegexTooltip_header || 'Regular Expression',
        description: globalTranslate.pr_ParserRegexTooltip_desc || 'Optional regex for extracting the number',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLXRvb2x0aXAtbWFuYWdlci5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJnZXRPdXRib3VuZFByb3h5VG9vbHRpcCIsImdldFRyYW5zcG9ydFByb3RvY29sVG9vbHRpcCIsImdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCIsImdldEZyb21SZWRlZmluaXRpb25Ub29sdGlwIiwiZ2V0U2lwUG9ydFRvb2x0aXAiLCJnZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCIsImdldFByb3ZpZGVySG9zdFRvb2x0aXAiLCJnZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwIiwiZ2V0RHRtZk1vZGVUb29sdGlwIiwiZ2V0Q2FsbGVySWRTb3VyY2VUb29sdGlwIiwiZ2V0RGlkU291cmNlVG9vbHRpcCIsImdldEN1c3RvbUhlYWRlclRvb2x0aXAiLCJnZXRQYXJzZXJSZWdleFRvb2x0aXAiLCJnZXRDYWxsZXJJZERpZERlYnVnVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdF9leGFtcGxlcyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfdXNhZ2VfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcCIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3AiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MiIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eSIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHkiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX3Byb3ZpZGVyIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX2hlYWRlciIsInByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2UiLCJwcl9RdWFsaWZ5U2Vzc2lvblRvb2x0aXBfcHVycG9zZV9kZXNjIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uIiwicHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIiLCJ3YXJuaW5nIiwidGV4dCIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmciLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2VyIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcl9kZXNjIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluIiwicHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2MiLCJwcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF91c2FnZSIsInByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9oZWFkZXIiLCJwcl9TSVBQb3J0VG9vbHRpcF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdCIsInByX1NJUFBvcnRUb29sdGlwX2RlZmF1bHRfdmFsdWUiLCJwcl9TSVBQb3J0VG9vbHRpcF9zdGFuZGFyZF9wb3J0cyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MiLCJub3RlIiwicHJfU0lQUG9ydFRvb2x0aXBfbm90ZSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwibGlzdDMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29udGFjdF91c2VyX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWEiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RfbWVkaWFfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnMiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90aW1lcnNfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZSIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VzIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMiLCJsaXN0NCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2dlbyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2JhY2t1cCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkIiwibGlzdDUiLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMiLCJsaXN0NiIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X2lwIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfc3VibmV0IiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9pbXBvcnRhbnQiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZCIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmZvIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzIiwicHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm8iLCJwcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyIiwicHJfRFRNRk1vZGVUb29sdGlwX3VzYWdlX2l2ciIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4iLCJwcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfY29uZiIsInByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9mZWF0dXJlcyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2hlYWRlciIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2RlZmF1bHQiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2Zyb20iLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfZnJvbV9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWQiLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcnBpZF9kZXNjIiwicHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3BhaSIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWlfZGVzYyIsInByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b20iLCJwcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2MiLCJwcl9EaWRTb3VyY2VUb29sdGlwX2hlYWRlciIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdCIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwicHJfRGlkU291cmNlVG9vbHRpcF90byIsInByX0RpZFNvdXJjZVRvb2x0aXBfdG9fZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uIiwicHJfRGlkU291cmNlVG9vbHRpcF9kaXZlcnNpb25fZGVzYyIsInByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tIiwicHJfRGlkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzYyIsInByX0N1c3RvbUhlYWRlclRvb2x0aXBfaGVhZGVyIiwicHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9kZXNjIiwicHJfUGFyc2VyUmVnZXhUb29sdGlwX2hlYWRlciIsInByX1BhcnNlclJlZ2V4VG9vbHRpcF9kZXNjIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZGVzYyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2UiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93aGF0X2xvZ2dlZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX29yaWdpbmFsX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2hlYWRlcl9jb250ZW50IiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfZXh0cmFjdGVkX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2ZpbmFsX3ZhbHVlcyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doZXJlX3RvX2ZpbmQiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9hc3Rlcmlza19jb25zb2xlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfc3lzdGVtX2xvZ3MiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93ZWJfaW50ZXJmYWNlIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlbl90b191c2UiLCJwcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF93cm9uZ19jYWxsZXJpZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2RpZCIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2N1c3RvbV9oZWFkZXJzIiwicHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfcHJvdmlkZXJfdGVzdGluZyIsInByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dhcm5pbmciLCJQcm92aWRlclRvb2x0aXBNYW5hZ2VyIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJ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SSxFQUFFbkMsZUFBZSxDQUFDa0s7QUFEakI7QUExQ04sT0FBUDtBQThDSDs7OztFQWpqQm1DQyxzQixHQXFqQnhDOzs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnRMLHlCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIC0gU3BlY2lhbGl6ZWQgdG9vbHRpcCBtYW5hZ2VtZW50IGZvciBTSVAgcHJvdmlkZXJzXG4gKiBcbiAqIFRoaXMgY2xhc3MgZXh0ZW5kcyB0aGUgYmFzZSBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHRvIHByb3ZpZGUgU0lQLXNwZWNpZmljXG4gKiB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLiBJdCBjb21iaW5lcyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcHMgd2l0aCBTSVAtc3BlY2lmaWNcbiAqIGZpZWxkIHRvb2x0aXBzIGZvciBjb21wcmVoZW5zaXZlIGZvcm0gZ3VpZGFuY2UuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBJbmhlcml0cyBjb21tb24gcHJvdmlkZXIgdG9vbHRpcCBmdW5jdGlvbmFsaXR5XG4gKiAtIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIChDYWxsZXJJRC9ESUQsIERUTUYsIHRyYW5zcG9ydCwgZXRjLilcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCBleGlzdGluZyBUb29sdGlwQnVpbGRlclxuICogLSBDb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nIGFuZCB2YWxpZGF0aW9uXG4gKiBcbiAqIEBjbGFzcyBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyXG4gKiBAZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIgZXh0ZW5kcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIGFic3RyYWN0IG1ldGhvZCBmcm9tIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXJcbiAgICAgKiBhbmQgcHJvdmlkZXMgYWxsIFNJUC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zLlxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBTSVAtc3BlY2lmaWMgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQcm92aWRlclNwZWNpZmljQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb3V0Ym91bmRfcHJveHknOiB0aGlzLmdldE91dGJvdW5kUHJveHlUb29sdGlwKCksXG4gICAgICAgICAgICAndHJhbnNwb3J0X3Byb3RvY29sJzogdGhpcy5nZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdxdWFsaWZ5X3Nlc3Npb24nOiB0aGlzLmdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2Zyb21fcmVkZWZpbml0aW9uJzogdGhpcy5nZXRGcm9tUmVkZWZpbml0aW9uVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3NpcF9wb3J0JzogdGhpcy5nZXRTaXBQb3J0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ21hbnVhbF9hdHRyaWJ1dGVzJzogdGhpcy5nZXRNYW51YWxBdHRyaWJ1dGVzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnOiB0aGlzLmdldFByb3ZpZGVySG9zdFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdhZGRpdGlvbmFsX2hvc3RzJzogdGhpcy5nZXRBZGRpdGlvbmFsSG9zdHNUb29sdGlwKCksXG4gICAgICAgICAgICAnZHRtZl9tb2RlJzogdGhpcy5nZXREdG1mTW9kZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdjaWRfc291cmNlJzogdGhpcy5nZXRDYWxsZXJJZFNvdXJjZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfc291cmNlJzogdGhpcy5nZXREaWRTb3VyY2VUb29sdGlwKCksXG4gICAgICAgICAgICAnY2lkX2N1c3RvbV9oZWFkZXInOiB0aGlzLmdldEN1c3RvbUhlYWRlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdkaWRfY3VzdG9tX2hlYWRlcic6IHRoaXMuZ2V0Q3VzdG9tSGVhZGVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2RpZF9wYXJzZXJfcmVnZXgnOiB0aGlzLmdldFBhcnNlclJlZ2V4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ2NhbGxlcmlkX2RpZF9kZWJ1Zyc6IHRoaXMuZ2V0Q2FsbGVySWREaWREZWJ1Z1Rvb2x0aXAoKVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IG91dGJvdW5kIHByb3h5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3Igb3V0Ym91bmQgcHJveHkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0T3V0Ym91bmRQcm94eVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0X2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX3VzYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRyYW5zcG9ydCBwcm90b2NvbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHRyYW5zcG9ydCBwcm90b2NvbCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUcmFuc3BvcnRQcm90b2NvbFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9yZWNfcHJvdmlkZXJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVhbGlmeSBzZXNzaW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgcXVhbGlmeSBzZXNzaW9uIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFF1YWxpZnlTZXNzaW9uVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1F1YWxpZnlTZXNzaW9uVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUXVhbGlmeVNlc3Npb25Ub29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGZyb20gcmVkZWZpbml0aW9uIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgZnJvbSByZWRlZmluaXRpb24gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RnJvbVJlZGVmaW5pdGlvblRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Gcm9tUmVkZWZpbml0aW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfZG9tYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0Zyb21SZWRlZmluaXRpb25Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRnJvbVJlZGVmaW5pdGlvblRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQIHBvcnQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVAgcG9ydCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTaXBQb3J0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVmYXVsdF92YWx1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfc3RhbmRhcmRfcG9ydHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjFfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBtYW51YWwgYXR0cmlidXRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIG1hbnVhbCBhdHRyaWJ1dGVzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldE1hbnVhbEF0dHJpYnV0ZXNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICdjb250YWN0X3VzZXI9MjMxJyxcbiAgICAgICAgICAgICAgICAnZGlyZWN0X21lZGlhPW5vJyxcbiAgICAgICAgICAgICAgICAncnRwX3N5bW1ldHJpYz1ubycsXG4gICAgICAgICAgICAgICAgJ3RpbWVycz0xMCcsXG4gICAgICAgICAgICAgICAgJ21heF9yZXRyaWVzPTEwJyxcbiAgICAgICAgICAgICAgICAnJywgXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAncXVhbGlmeV9mcmVxdWVuY3k9NjAnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICdbcmVnaXN0cmF0aW9uXScsXG4gICAgICAgICAgICAgICAgJ3JldHJ5X2ludGVydmFsPTYwJyxcbiAgICAgICAgICAgICAgICAnbWF4X3JldHJpZXM9MTAnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb250YWN0X3VzZXJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0X21lZGlhX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3J0cF9zeW1tZXRyaWMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ydHBfc3ltbWV0cmljX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVycyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RpbWVyc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHByb3ZpZGVyIGhvc3QgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBwcm92aWRlciBob3N0IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFByb3ZpZGVySG9zdFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFkZGl0aW9uYWwgaG9zdHMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBhZGRpdGlvbmFsIGhvc3RzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFkZGl0aW9uYWxIb3N0c1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9zZWN1cml0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfY2FzZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF91c2VfZ2VvLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3VzZV9iYWNrdXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfdXNlX2Nsb3VkXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Zvcm1hdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZm9ybWF0X3N1Ym5ldCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9mb3JtYXRfZG9tYWluXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaW1wb3J0YW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IERUTUYgbW9kZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIERUTUYgbW9kZSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXREdG1mTW9kZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfbW9kZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9waW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF91c2FnZV9jb25mLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfdXNhZ2VfZmVhdHVyZXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ2FsbGVySUQgc291cmNlIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQ2FsbGVySUQgc291cmNlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldENhbGxlcklkU291cmNlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9oZWFkZXIgfHwgJ0NhbGxlcklEIFNvdXJjZScsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZXNjIHx8ICdTZWxlY3QgdGhlIFNJUCBoZWFkZXIgdG8gZXh0cmFjdCB0aGUgY2FsbGVyIElEIGZyb20nLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0IHx8ICdEZWZhdWx0JyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9kZWZhdWx0X2Rlc2MgfHwgJ1VzZSBzdGFuZGFyZCBBc3RlcmlzayBsb2dpYydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tIHx8ICdGUk9NJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9mcm9tX2Rlc2MgfHwgJ0V4dHJhY3QgZnJvbSBGUk9NIGhlYWRlcidcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9ycGlkIHx8ICdSZW1vdGUtUGFydHktSUQnLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX3JwaWRfZGVzYyB8fCAnRXh0cmFjdCBmcm9tIFJlbW90ZS1QYXJ0eS1JRCBoZWFkZXInXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVRvb2x0aXBfcGFpIHx8ICdQLUFzc2VydGVkLUlkZW50aXR5JyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9wYWlfZGVzYyB8fCAnRXh0cmFjdCBmcm9tIFAtQXNzZXJ0ZWQtSWRlbnRpdHkgaGVhZGVyJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VUb29sdGlwX2N1c3RvbSB8fCAnQ3VzdG9tJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlVG9vbHRpcF9jdXN0b21fZGVzYyB8fCAnRXh0cmFjdCBmcm9tIGEgY3VzdG9tIGhlYWRlcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnUm9pc3RhdDogeC1yb2lzdGF0LXBob25lJyxcbiAgICAgICAgICAgICAgICAnTWFuZ286IERpdmVyc2lvbidcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgRElEIHNvdXJjZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIERJRCBzb3VyY2UgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0RGlkU291cmNlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfaGVhZGVyIHx8ICdESUQgU291cmNlJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kZXNjIHx8ICdTZWxlY3QgaG93IHRvIGRldGVybWluZSB0aGUgZGlhbGVkIG51bWJlcicsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG9vbHRpcF9kZWZhdWx0IHx8ICdEZWZhdWx0JyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGVmYXVsdF9kZXNjIHx8ICdVc2UgUmVxdWVzdC1VUkknXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX3RvIHx8ICdUTycsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX3RvX2Rlc2MgfHwgJ0V4dHJhY3QgZnJvbSBUTyBoZWFkZXInXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2RpdmVyc2lvbiB8fCAnRGl2ZXJzaW9uJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfZGl2ZXJzaW9uX2Rlc2MgfHwgJ0ZvciBmb3J3YXJkZWQgY2FsbHMnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VUb29sdGlwX2N1c3RvbSB8fCAnQ3VzdG9tJyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvb2x0aXBfY3VzdG9tX2Rlc2MgfHwgJ0V4dHJhY3QgZnJvbSBhIGN1c3RvbSBoZWFkZXInXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXN0b20gaGVhZGVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgY3VzdG9tIGhlYWRlciBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRDdXN0b21IZWFkZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQ3VzdG9tSGVhZGVyVG9vbHRpcF9oZWFkZXIgfHwgJ0N1c3RvbSBIZWFkZXIgTmFtZScsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0N1c3RvbUhlYWRlclRvb2x0aXBfZGVzYyB8fCAnU3BlY2lmeSB0aGUgZXhhY3QgU0lQIGhlYWRlciBuYW1lJyxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ1gtQ2FsbGVyLUlEJyxcbiAgICAgICAgICAgICAgICAnWC1PcmlnaW5hbC1OdW1iZXInLFxuICAgICAgICAgICAgICAgICd4LXJvaXN0YXQtcGhvbmUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhcnNlciByZWdleCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHBhcnNlciByZWdleCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQYXJzZXJSZWdleFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QYXJzZXJSZWdleFRvb2x0aXBfaGVhZGVyIHx8ICdSZWd1bGFyIEV4cHJlc3Npb24nLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9QYXJzZXJSZWdleFRvb2x0aXBfZGVzYyB8fCAnT3B0aW9uYWwgcmVnZXggZm9yIGV4dHJhY3RpbmcgdGhlIG51bWJlcicsXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdbMC05XSsgLSBkaWdpdHMgb25seScsXG4gICAgICAgICAgICAgICAgJ1srXT9bMC05XSsgLSBkaWdpdHMgd2l0aCBvcHRpb25hbCArJyxcbiAgICAgICAgICAgICAgICAnWzAtOV17NywxNX0gLSA3IHRvIDE1IGRpZ2l0cydcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ2FsbGVySUQvRElEIGRlYnVnIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQ2FsbGVySUQvRElEIGRlYnVnIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldENhbGxlcklkRGlkRGVidWdUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3doYXRfbG9nZ2VkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX29yaWdpbmFsX3ZhbHVlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfaGVhZGVyX2NvbnRlbnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2V4dHJhY3RlZF92YWx1ZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX2ZpbmFsX3ZhbHVlc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlcmVfdG9fZmluZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9hc3Rlcmlza19jb25zb2xlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZERpZERlYnVnVG9vbHRpcF9zeXN0ZW1fbG9ncyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2ViX2ludGVyZmFjZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd2hlbl90b191c2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfd3JvbmdfY2FsbGVyaWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dyb25nX2RpZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWREaWREZWJ1Z1Rvb2x0aXBfY3VzdG9tX2hlYWRlcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3Byb3ZpZGVyX3Rlc3RpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkRGlkRGVidWdUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyO1xufSJdfQ==