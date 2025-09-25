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

/* global globalTranslate, TooltipBuilder */

/**
 * ExtensionTooltipManager - Manages tooltips for Extension form fields
 * 
 * This class provides tooltip configurations for extension settings fields,
 * helping users understand advanced SIP settings and their implications.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 * 
 * Features:
 * - Tooltip configurations for SIP settings
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and warnings
 * 
 * @class ExtensionTooltipManager
 */
class ExtensionTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('ExtensionTooltipManager is a static class and cannot be instantiated');
    }
    
    /**
     * Initialize all tooltips for the extension form
     * Uses the unified TooltipBuilder for consistent behavior
     * 
     * @static
     */
    static initialize() {
        try {
            const tooltipConfigs = this.getTooltipConfigurations();
            
            // Use TooltipBuilder to initialize all tooltips
            if (typeof TooltipBuilder !== 'undefined') {
                TooltipBuilder.initialize(tooltipConfigs, {
                    selector: '.field-info-icon',
                    position: 'top right',
                    hoverable: true,
                    variation: 'flowing'
                });
            } else {
                // Fallback to direct implementation if TooltipBuilder not available
                this.initializeFallback(tooltipConfigs);
            }
        } catch (error) {
            // Failed to initialize extension tooltips
        }
    }
    
    /**
     * Get all tooltip configurations for extension fields
     * 
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */
    static getTooltipConfigurations() {
        return {
            // Mobile dial string tooltip
            mobile_dialstring: {
                header: globalTranslate.ex_MobileDialstringTooltip_header,
                description: globalTranslate.ex_MobileDialstringTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_format,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_format_desc
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_provider,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_provider_desc
                    },
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_usage_forward,
                        definition: globalTranslate.ex_MobileDialstringTooltip_usage_forward_desc
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.ex_MobileDialstringTooltip_examples_header,
                        definition: null
                    }
                ],
                examples: globalTranslate.ex_MobileDialstringTooltip_examples ? 
                    globalTranslate.ex_MobileDialstringTooltip_examples.split('|') : [],
                note: globalTranslate.ex_MobileDialstringTooltip_note
            },
            
            // SIP DTMF mode tooltip
            sip_dtmfmode: {
                header: globalTranslate.ex_SipDtmfmodeTooltip_header,
                description: globalTranslate.ex_SipDtmfmodeTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_SipDtmfmodeTooltip_list_auto,
                        definition: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_desc
                    },
                    {
                        term: globalTranslate.ex_SipDtmfmodeTooltip_list_inband,
                        definition: globalTranslate.ex_SipDtmfmodeTooltip_list_inband_desc
                    },
                    {
                        term: globalTranslate.ex_SipDtmfmodeTooltip_list_info,
                        definition: globalTranslate.ex_SipDtmfmodeTooltip_list_info_desc
                    },
                    {
                        term: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733,
                        definition: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733_desc
                    },
                    {
                        term: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info,
                        definition: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info_desc
                    }
                ]
            },
            
            // SIP transport tooltip
            sip_transport: {
                header: globalTranslate.ex_SipTransportTooltip_header,
                description: globalTranslate.ex_SipTransportTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_SipTransportTooltip_protocols_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_udp_tcp,
                        definition: globalTranslate.ex_SipTransportTooltip_udp_tcp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_udp, 
                        definition: globalTranslate.ex_SipTransportTooltip_udp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_tcp,
                        definition: globalTranslate.ex_SipTransportTooltip_tcp_desc
                    },
                    {
                        term: globalTranslate.ex_SipTransportTooltip_tls,
                        definition: globalTranslate.ex_SipTransportTooltip_tls_desc
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.ex_SipTransportTooltip_recommendations_header,
                        definition: null
                    }
                ],
                list3: [
                    globalTranslate.ex_SipTransportTooltip_rec_compatibility
                ]
            },
            
            // Network filter tooltip
            sip_networkfilterid: {
                header: globalTranslate.ex_SipNetworkfilteridTooltip_header,
                description: globalTranslate.ex_SipNetworkfilteridTooltip_desc,
                warning: {
                    header: globalTranslate.ex_SipNetworkfilteridTooltip_warning_header,
                    text: globalTranslate.ex_SipNetworkfilteridTooltip_warning
                }
            },
            
            // Manual attributes tooltip with code examples
            sip_manualattributes: {
                header: globalTranslate.ex_SipManualattributesTooltip_header,
                description: globalTranslate.ex_SipManualattributesTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_format,
                        definition: globalTranslate.ex_SipManualattributesTooltip_format_desc
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_examples_header,
                        definition: null
                    }
                ],
                examples: [
                    '[endpoint]',
                    'device_state_busy_at=2',
                    'max_audio_streams=1',
                    'direct_media=no',
                    'trust_id_inbound=yes',
                    'force_rport=yes',
                    'rewrite_contact=yes',
                    'rtp_timeout=180',
                    'rtp_timeout_hold=900',
                    'rtp_keepalive=60',
                    '',
                    '',
                    '[aor]',
                    'max_contacts=3',
                    'remove_existing=yes',
                    'remove_unavailable=yes',
                    'qualify_frequency=30',
                    'qualify_timeout=3',
                    '',
                    '',
                    '[auth]',
                    'auth_type=userpass'
                ],
                list3: [
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_common_params,
                        definition: null
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_direct_media,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_direct_media_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_trust_id_inbound,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_trust_id_inbound_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_force_rport,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_force_rport_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_keepalive,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_keepalive_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_qualify_timeout,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_qualify_timeout_desc
                    },
                    {
                        term: globalTranslate.ex_SipManualattributesTooltip_list_remove_unavailable,
                        definition: globalTranslate.ex_SipManualattributesTooltip_list_remove_unavailable_desc
                    }
                ],
                note: globalTranslate.ex_SipManualattributesTooltip_note,
                warning: {
                    header: globalTranslate.ex_SipManualattributesTooltip_warning_header,
                    text: globalTranslate.ex_SipManualattributesTooltip_warning
                }
            }
        };
    }
    
    /**
     * Fallback implementation when TooltipBuilder is not available
     * 
     * @private
     * @static
     * @param {Object} configs - Tooltip configurations object
     */
    static initializeFallback(configs) {
        $('.field-info-icon').each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const tooltipData = configs[fieldName];
            
            if (tooltipData) {
                const content = this.buildTooltipContent(tooltipData);
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
     * Build HTML content for tooltip popup (fallback implementation)
     * This method is kept for backward compatibility when TooltipBuilder is not available
     * 
     * @private
     * @static
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */
    static buildTooltipContent(config) {
        if (!config) return '';
        
        let html = '';
        
        // Add header if exists
        if (config.header) {
            html += `<div class="header"><strong>${config.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (config.description) {
            html += `<p>${config.description}</p>`;
        }
        
        // Add list items if exist
        if (config.list) {
            html = this.addListToContent(html, config.list);
        }
        
        // Add additional lists (list2, list3, etc.)
        for (let i = 2; i <= 10; i++) {
            const listName = `list${i}`;
            if (config[listName] && config[listName].length > 0) {
                html = this.addListToContent(html, config[listName]);
            }
        }
        
        // Add warning if exists
        if (config.warning) {
            html += this.buildWarningSection(config.warning);
        }
        
        // Add code examples if exist
        if (config.examples && config.examples.length > 0) {
            html += this.buildCodeExamples(config.examples, config.examplesHeader);
        }
        
        // Add note if exists
        if (config.note) {
            html += `<p><em>${config.note}</em></p>`;
        }
        
        return html;
    }
    
    /**
     * Add list items to tooltip content (fallback implementation)
     * 
     * @private
     * @static
     * @param {string} html - Current HTML content
     * @param {Array|Object} list - List of items to add
     * @returns {string} - Updated HTML content
     */
    static addListToContent(html, list) {
        if (Array.isArray(list) && list.length > 0) {
            html += '<ul>';
            list.forEach(item => {
                if (typeof item === 'string') {
                    html += `<li>${item}</li>`;
                } else if (item.term && item.definition === null) {
                    // Header item without definition
                    html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                } else if (item.term && item.definition) {
                    html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            html += '</ul>';
        } else if (typeof list === 'object') {
            // Old format - object with key-value pairs
            html += '<ul>';
            Object.entries(list).forEach(([term, definition]) => {
                html += `<li><strong>${term}:</strong> ${definition}</li>`;
            });
            html += '</ul>';
        }
        
        return html;
    }
    
    /**
     * Build warning section for tooltip (fallback implementation)
     * 
     * @private
     * @static
     * @param {Object} warning - Warning configuration
     * @returns {string} - HTML string for warning section
     */
    static buildWarningSection(warning) {
        let html = '<div class="ui small orange message">';
        if (warning.header) {
            html += `<div class="header">`;
            html += `<i class="exclamation triangle icon"></i> `;
            html += warning.header;
            html += `</div>`;
        }
        html += warning.text;
        html += '</div>';
        return html;
    }
    
    /**
     * Build code examples section (fallback implementation)
     * 
     * @private
     * @static
     * @param {Array} examples - Array of code example lines
     * @param {string} header - Optional header for examples section
     * @returns {string} - HTML string for code examples
     */
    static buildCodeExamples(examples, header) {
        let html = '';
        
        if (header) {
            html += `<p><strong>${header}:</strong></p>`;
        }
        
        html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
        html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
        
        // Process examples with syntax highlighting for sections
        examples.forEach((line, index) => {
            if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                // Section header
                if (index > 0) html += '\n';
                html += `<span style="color: #0084b4; font-weight: bold;">${line}</span>`;
            } else if (line.includes('=')) {
                // Parameter line
                const [param, value] = line.split('=', 2);
                html += `\n<span style="color: #7a3e9d;">${param}</span>=<span style="color: #cf4a4c;">${value}</span>`;
            } else {
                // Regular line
                html += line ? `\n${line}` : '';
            }
        });
        
        html += '</pre>';
        html += '</div>';
        
        return html;
    }
    
    /**
     * Update specific tooltip content dynamically
     * 
     * @static
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     */
    static updateTooltip(fieldName, tooltipData) {
        try {
            if (typeof TooltipBuilder !== 'undefined') {
                TooltipBuilder.update(fieldName, tooltipData);
            } else {
                console.error('TooltipBuilder is not available for updating tooltip');
            }
        } catch (error) {
            console.error(`Failed to update tooltip for field '${fieldName}':`, error);
        }
    }

    /**
     * Destroy all extension tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */
    static destroy(selector = '.field-info-icon') {
        try {
            if (typeof TooltipBuilder !== 'undefined') {
                TooltipBuilder.destroy(selector);
            } else {
                $(selector).popup('destroy');
            }
        } catch (error) {
            console.error('Failed to destroy extension tooltips:', error);
        }
    }
}

// Export for use in extension-modify.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionTooltipManager;
}