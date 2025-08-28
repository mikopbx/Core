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
class ProviderSipTooltipManager extends ProviderTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        super();
        throw new Error('ProviderSipTooltipManager is a static class and cannot be instantiated');
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
    static getProviderSpecificConfigurations() {
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
    static getOutboundProxyTooltip() {
        return {
            header: globalTranslate.pr_OutboundProxyTooltip_header,
            description: globalTranslate.pr_OutboundProxyTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_OutboundProxyTooltip_format,
                    definition: globalTranslate.pr_OutboundProxyTooltip_format_examples
                },
                {
                    term: globalTranslate.pr_OutboundProxyTooltip_usage,
                    definition: globalTranslate.pr_OutboundProxyTooltip_usage_desc
                }
            ]
        };
    }

    /**
     * Get transport protocol tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for transport protocol field
     */
    static getTransportProtocolTooltip() {
        return {
            header: globalTranslate.pr_TransportProtocolTooltip_header,
            description: globalTranslate.pr_TransportProtocolTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_protocols_header,
                    definition: null
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_udp_tcp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_udp_tcp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_udp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_udp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_tcp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_tcp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_tls,
                    definition: globalTranslate.pr_TransportProtocolTooltip_tls_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_recommendations_header,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_TransportProtocolTooltip_rec_compatibility,
                globalTranslate.pr_TransportProtocolTooltip_rec_security,
                globalTranslate.pr_TransportProtocolTooltip_rec_provider
            ]
        };
    }

    /**
     * Get qualify session tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for qualify session field
     */
    static getQualifySessionTooltip() {
        return {
            header: globalTranslate.pr_QualifySessionTooltip_header,
            description: globalTranslate.pr_QualifySessionTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_QualifySessionTooltip_purpose,
                    definition: globalTranslate.pr_QualifySessionTooltip_purpose_desc
                },
                {
                    term: globalTranslate.pr_QualifySessionTooltip_recommendation,
                    definition: globalTranslate.pr_QualifySessionTooltip_recommendation_desc
                }
            ]
        };
    }

    /**
     * Get from redefinition tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for from redefinition field
     */
    static getFromRedefinitionTooltip() {
        return {
            header: globalTranslate.pr_FromRedefinitionTooltip_header,
            warning: {
                text: globalTranslate.pr_FromRedefinitionTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_user,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_user_desc
                },
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_domain,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_domain_desc
                },
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_usage,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_usage_desc
                }
            ]
        };
    }

    /**
     * Get SIP port tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SIP port field
     */
    static getSipPortTooltip() {
        return {
            header: globalTranslate.pr_SIPPortTooltip_header,
            description: globalTranslate.pr_SIPPortTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_SIPPortTooltip_default,
                    definition: globalTranslate.pr_SIPPortTooltip_default_value
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_standard_ports,
                    definition: null
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_port_5060,
                    definition: globalTranslate.pr_SIPPortTooltip_port_5060_desc
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_port_5061,
                    definition: globalTranslate.pr_SIPPortTooltip_port_5061_desc
                }
            ],
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
    static getManualAttributesTooltip() {
        return {
            header: globalTranslate.pr_ManualAttributesTooltip_header,
            description: globalTranslate.pr_ManualAttributesTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_format,
                    definition: globalTranslate.pr_ManualAttributesTooltip_format_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_examples_header,
                    definition: null
                }
            ],
            examples: [
                '[endpoint]',
                'contact_user=231',
                'direct_media=no',
                'rtp_symmetric=no',
                'timers=10',
                'max_retries=10',
                '', 
                '',
                '[aor]',
                'qualify_frequency=60',
                '',
                '',
                '[registration]',
                'retry_interval=60',
                'max_retries=10'
            ],
            list3: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_common_params,
                    definition: null
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_contact_user,
                    definition: globalTranslate.pr_ManualAttributesTooltip_contact_user_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_direct_media,
                    definition: globalTranslate.pr_ManualAttributesTooltip_direct_media_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric,
                    definition: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_timers,
                    definition: globalTranslate.pr_ManualAttributesTooltip_timers_desc
                }
            ],
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
    static getProviderHostTooltip() {
        return {
            header: globalTranslate.pr_ProviderHostTooltip_header,
            description: globalTranslate.pr_ProviderHostTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_ProviderHostTooltip_formats,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_ProviderHostTooltip_format_ip,
                globalTranslate.pr_ProviderHostTooltip_format_domain
            ],
            list3: [
                {
                    term: globalTranslate.pr_ProviderHostTooltip_outbound,
                    definition: globalTranslate.pr_ProviderHostTooltip_outbound_desc
                },
                {
                    term: globalTranslate.pr_ProviderHostTooltip_none,
                    definition: globalTranslate.pr_ProviderHostTooltip_none_desc
                }
            ],
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
    static getAdditionalHostsTooltip() {
        return {
            header: globalTranslate.pr_AdditionalHostsTooltip_header,
            description: globalTranslate.pr_AdditionalHostsTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_purposes,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_AdditionalHostsTooltip_purpose_id,
                globalTranslate.pr_AdditionalHostsTooltip_purpose_multi,
                globalTranslate.pr_AdditionalHostsTooltip_purpose_security
            ],
            list3: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_use_cases,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.pr_AdditionalHostsTooltip_use_geo,
                globalTranslate.pr_AdditionalHostsTooltip_use_backup,
                globalTranslate.pr_AdditionalHostsTooltip_use_cloud
            ],
            list5: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_formats,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.pr_AdditionalHostsTooltip_format_ip,
                globalTranslate.pr_AdditionalHostsTooltip_format_subnet,
                globalTranslate.pr_AdditionalHostsTooltip_format_domain
            ],
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
    static getDtmfModeTooltip() {
        return {
            header: globalTranslate.pr_DTMFModeTooltip_header,
            description: globalTranslate.pr_DTMFModeTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_DTMFModeTooltip_modes_header,
                    definition: null
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_auto,
                    definition: globalTranslate.pr_DTMFModeTooltip_auto_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_inband,
                    definition: globalTranslate.pr_DTMFModeTooltip_inband_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_info,
                    definition: globalTranslate.pr_DTMFModeTooltip_info_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_rfc4733,
                    definition: globalTranslate.pr_DTMFModeTooltip_rfc4733_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_auto_info,
                    definition: globalTranslate.pr_DTMFModeTooltip_auto_info_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_usage_header,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_DTMFModeTooltip_usage_ivr,
                globalTranslate.pr_DTMFModeTooltip_usage_pin,
                globalTranslate.pr_DTMFModeTooltip_usage_conf,
                globalTranslate.pr_DTMFModeTooltip_usage_features
            ],
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
    static getCallerIdSourceTooltip() {
        return {
            header: globalTranslate.pr_CallerIdSourceTooltip_header || 'CallerID Source',
            description: globalTranslate.pr_CallerIdSourceTooltip_desc || 'Select the SIP header to extract the caller ID from',
            list: [
                {
                    term: globalTranslate.pr_CallerIdSourceTooltip_default || 'Default',
                    definition: globalTranslate.pr_CallerIdSourceTooltip_default_desc || 'Use standard Asterisk logic'
                },
                {
                    term: globalTranslate.pr_CallerIdSourceTooltip_from || 'FROM',
                    definition: globalTranslate.pr_CallerIdSourceTooltip_from_desc || 'Extract from FROM header'
                },
                {
                    term: globalTranslate.pr_CallerIdSourceTooltip_rpid || 'Remote-Party-ID',
                    definition: globalTranslate.pr_CallerIdSourceTooltip_rpid_desc || 'Extract from Remote-Party-ID header'
                },
                {
                    term: globalTranslate.pr_CallerIdSourceTooltip_pai || 'P-Asserted-Identity',
                    definition: globalTranslate.pr_CallerIdSourceTooltip_pai_desc || 'Extract from P-Asserted-Identity header'
                },
                {
                    term: globalTranslate.pr_CallerIdSourceTooltip_custom || 'Custom',
                    definition: globalTranslate.pr_CallerIdSourceTooltip_custom_desc || 'Extract from a custom header'
                }
            ],
            examples: [
                'Roistat: x-roistat-phone',
                'Mango: Diversion'
            ]
        };
    }

    /**
     * Get DID source tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for DID source field
     */
    static getDidSourceTooltip() {
        return {
            header: globalTranslate.pr_DidSourceTooltip_header || 'DID Source',
            description: globalTranslate.pr_DidSourceTooltip_desc || 'Select how to determine the dialed number',
            list: [
                {
                    term: globalTranslate.pr_DidSourceTooltip_default || 'Default',
                    definition: globalTranslate.pr_DidSourceTooltip_default_desc || 'Use Request-URI'
                },
                {
                    term: globalTranslate.pr_DidSourceTooltip_to || 'TO',
                    definition: globalTranslate.pr_DidSourceTooltip_to_desc || 'Extract from TO header'
                },
                {
                    term: globalTranslate.pr_DidSourceTooltip_diversion || 'Diversion',
                    definition: globalTranslate.pr_DidSourceTooltip_diversion_desc || 'For forwarded calls'
                },
                {
                    term: globalTranslate.pr_DidSourceTooltip_custom || 'Custom',
                    definition: globalTranslate.pr_DidSourceTooltip_custom_desc || 'Extract from a custom header'
                }
            ]
        };
    }

    /**
     * Get custom header tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for custom header field
     */
    static getCustomHeaderTooltip() {
        return {
            header: globalTranslate.pr_CustomHeaderTooltip_header || 'Custom Header Name',
            description: globalTranslate.pr_CustomHeaderTooltip_desc || 'Specify the exact SIP header name',
            examples: [
                'X-Caller-ID',
                'X-Original-Number',
                'x-roistat-phone'
            ]
        };
    }

    /**
     * Get parser regex tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for parser regex field
     */
    static getParserRegexTooltip() {
        return {
            header: globalTranslate.pr_ParserRegexTooltip_header || 'Regular Expression',
            description: globalTranslate.pr_ParserRegexTooltip_desc || 'Optional regex for extracting the number',
            examples: [
                '([0-9]+) - digits only',
                '(\\+?[0-9]+) - digits with optional +',
                '(?<=tel:)[0-9]+ - after tel:'
            ]
        };
    }

    /**
     * Get CallerID/DID debug tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for CallerID/DID debug field
     */
    static getCallerIdDidDebugTooltip() {
        return {
            header: globalTranslate.pr_CallerIdDidDebugTooltip_header,
            description: globalTranslate.pr_CallerIdDidDebugTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_CallerIdDidDebugTooltip_purpose,
                    definition: globalTranslate.pr_CallerIdDidDebugTooltip_purpose_desc
                },
                {
                    term: globalTranslate.pr_CallerIdDidDebugTooltip_what_logged,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_CallerIdDidDebugTooltip_original_values,
                globalTranslate.pr_CallerIdDidDebugTooltip_header_content,
                globalTranslate.pr_CallerIdDidDebugTooltip_extracted_values,
                globalTranslate.pr_CallerIdDidDebugTooltip_final_values
            ],
            list3: [
                {
                    term: globalTranslate.pr_CallerIdDidDebugTooltip_where_to_find,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.pr_CallerIdDidDebugTooltip_asterisk_console,
                globalTranslate.pr_CallerIdDidDebugTooltip_system_logs,
                globalTranslate.pr_CallerIdDidDebugTooltip_web_interface
            ],
            list5: [
                {
                    term: globalTranslate.pr_CallerIdDidDebugTooltip_when_to_use,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.pr_CallerIdDidDebugTooltip_wrong_callerid,
                globalTranslate.pr_CallerIdDidDebugTooltip_wrong_did,
                globalTranslate.pr_CallerIdDidDebugTooltip_custom_headers,
                globalTranslate.pr_CallerIdDidDebugTooltip_provider_testing
            ],
            warning: {
                text: globalTranslate.pr_CallerIdDidDebugTooltip_warning
            }
        };
    }

}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderSipTooltipManager;
}