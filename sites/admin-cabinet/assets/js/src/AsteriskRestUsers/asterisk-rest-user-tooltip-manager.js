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
 * AsteriskRestUserTooltipManager - Manages tooltips for ARI user form fields
 * 
 * This class provides tooltip configurations for ARI settings fields,
 * helping users understand Stasis applications and connection details.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 * 
 * @class AsteriskRestUserTooltipManager
 */
class AsteriskRestUserTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('AsteriskRestUserTooltipManager is a static class and cannot be instantiated');
    }
    
    /**
     * Initialize all tooltips for the ARI user form
     * Uses the unified TooltipBuilder for consistent behavior
     * 
     * @static
     * @param {string} serverIP - Server IP address for connection examples
     */
    static initialize(serverIP = '') {
        try {
            const tooltipConfigs = this.getTooltipConfigurations(serverIP);
            
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
                console.warn('TooltipBuilder not available, using fallback implementation');
                this.initializeFallback(tooltipConfigs);
            }
        } catch (error) {
            console.error('Failed to initialize ARI user tooltips:', error);
        }
    }
    
    /**
     * Get all tooltip configurations for ARI user fields
     * 
     * @static
     * @param {string} serverIP - Server IP address for connection examples
     * @returns {Object} Object with field names as keys and tooltip data as values
     */
    static getTooltipConfigurations(serverIP = '') {
        return {
            // Applications field tooltip
            applications: {
                header: globalTranslate.ari_ApplicationsTooltip_header,
                description: globalTranslate.ari_ApplicationsTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ari_ApplicationsTooltip_usage_header,
                        definition: null
                    },
                    globalTranslate.ari_ApplicationsTooltip_usage_desc,
                    {
                        term: globalTranslate.ari_ApplicationsTooltip_common_header,
                        definition: null
                    },
                    {
                        term: 'ari-app',
                        definition: globalTranslate.ari_ApplicationsTooltip_common_ari_app
                    },
                    {
                        term: 'stasis',
                        definition: globalTranslate.ari_ApplicationsTooltip_common_stasis
                    },
                    {
                        term: 'external-media',
                        definition: globalTranslate.ari_ApplicationsTooltip_common_external_media
                    },
                    {
                        term: 'bridge-app',
                        definition: globalTranslate.ari_ApplicationsTooltip_common_bridge_app
                    },
                    {
                        term: 'channel-spy',
                        definition: globalTranslate.ari_ApplicationsTooltip_common_channel_spy
                    }
                ],
                warning: {
                    header: globalTranslate.ari_ApplicationsTooltip_warning_header,
                    text: globalTranslate.ari_ApplicationsTooltip_warning
                },
                note: globalTranslate.ari_ApplicationsTooltip_note
            },
            
            // Connection info tooltip
            connection_info: {
                header: globalTranslate.ari_ConnectionInfoTooltip_header,
                description: globalTranslate.ari_ConnectionInfoTooltip_desc,
                list: [
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_websocket_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_websocket_url,
                        definition: `ws://${serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder}:8088/ari/events?app=[application]&subscribe=all`
                    },
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_websocket_secure,
                        definition: `wss://${serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder}:8089/ari/events?app=[application]&subscribe=all`
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_rest_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_rest_url,
                        definition: `http://${serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder}:8088/ari/`
                    },
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_rest_secure,
                        definition: `https://${serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder}:8089/ari/`
                    }
                ],
                list3: [
                    {
                        term: globalTranslate.ari_ConnectionInfoTooltip_auth_header,
                        definition: null
                    },
                    globalTranslate.ari_ConnectionInfoTooltip_auth_desc
                ],
                examples: globalTranslate.ari_ConnectionInfoTooltip_examples ? 
                    globalTranslate.ari_ConnectionInfoTooltip_examples.split('|') : [],
                examplesHeader: globalTranslate.ari_ConnectionInfoTooltip_examples_header,
                note: globalTranslate.ari_ConnectionInfoTooltip_note
            }
        };
    }
    
    /**
     * Fallback implementation if TooltipBuilder is not available
     * 
     * @static
     * @param {Object} tooltipConfigs - Tooltip configurations
     */
    static initializeFallback(tooltipConfigs) {
        $('.field-info-icon').each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const tooltipData = tooltipConfigs[fieldName];
            
            if (tooltipData) {
                // Build tooltip content manually
                let content = this.buildFallbackContent(tooltipData);
                
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
     * Build tooltip content for fallback implementation
     * 
     * @static
     * @param {Object} tooltipData - Tooltip data
     * @returns {string} HTML content for tooltip
     */
    static buildFallbackContent(tooltipData) {
        if (!tooltipData) return '';
        
        let html = '';
        
        // Add header
        if (tooltipData.header) {
            html += `<div class="header">${tooltipData.header}</div>`;
        }
        
        // Add description
        if (tooltipData.description) {
            html += `<p>${tooltipData.description}</p>`;
        }
        
        // Add lists
        const buildList = (list) => {
            let listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
            list.forEach(item => {
                if (typeof item === 'string') {
                    listHtml += `<li>${item}</li>`;
                } else if (item.definition === null) {
                    listHtml += `</ul><p><strong>${item.term}</strong></p><ul style="margin: 0.5em 0; padding-left: 1.5em;">`;
                } else {
                    listHtml += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            listHtml += '</ul>';
            return listHtml;
        };
        
        // Add all lists
        for (let i = 1; i <= 10; i++) {
            const listKey = i === 1 ? 'list' : `list${i}`;
            if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
                html += buildList(tooltipData[listKey]);
            }
        }
        
        // Add warning
        if (tooltipData.warning) {
            html += '<div class="ui warning message" style="margin: 0.5em 0;">';
            if (tooltipData.warning.header) {
                html += `<div class="header">${tooltipData.warning.header}</div>`;
            }
            if (tooltipData.warning.text) {
                html += `<p>${tooltipData.warning.text}</p>`;
            }
            html += '</div>';
        }
        
        // Add examples
        if (tooltipData.examples && tooltipData.examples.length > 0) {
            if (tooltipData.examplesHeader) {
                html += `<p><strong>${tooltipData.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8;">';
            html += '<pre style="margin: 0; font-size: 0.9em;">';
            tooltipData.examples.forEach(line => {
                html += line + '\n';
            });
            html += '</pre></div>';
        }
        
        // Add note
        if (tooltipData.note) {
            html += `<p><em>${tooltipData.note}</em></p>`;
        }
        
        return html;
    }
}