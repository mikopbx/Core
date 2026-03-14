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
 * Fail2BanTooltipManager - Manages tooltips for Fail2Ban form fields
 *
 * This class provides tooltip configurations for Fail2Ban settings fields,
 * helping users understand intrusion prevention parameters and whitelist configuration.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * @class Fail2BanTooltipManager
 */
class Fail2BanTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('Fail2BanTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Initialize all tooltips for the Fail2Ban form
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
                console.warn('TooltipBuilder not available, using fallback implementation');
                this.initializeFallback(tooltipConfigs);
            }
        } catch (error) {
            console.error('Failed to initialize Fail2Ban tooltips:', error);
        }
    }

    /**
     * Get all tooltip configurations for Fail2Ban fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */
    static getTooltipConfigurations() {
        return {
            // Max retry field tooltip
            maxretry: {
                header: globalTranslate.f2b_MaxRetryTooltip_header,
                description: globalTranslate.f2b_MaxRetryTooltip_desc,
                list: [
                    {
                        term: globalTranslate.f2b_MaxRetryTooltip_how_it_works,
                        definition: null
                    },
                    globalTranslate.f2b_MaxRetryTooltip_how_it_works_desc,
                    {
                        term: globalTranslate.f2b_MaxRetryTooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.f2b_MaxRetryTooltip_example_3,
                    globalTranslate.f2b_MaxRetryTooltip_example_5,
                    globalTranslate.f2b_MaxRetryTooltip_example_10
                ],
                warning: {
                    header: globalTranslate.f2b_MaxRetryTooltip_warning_header,
                    text: globalTranslate.f2b_MaxRetryTooltip_warning
                },
                note: globalTranslate.f2b_MaxRetryTooltip_note
            },

            // Whitelist field tooltip
            whitelist: {
                header: globalTranslate.f2b_WhitelistTooltip_header,
                description: globalTranslate.f2b_WhitelistTooltip_desc,
                list: [
                    {
                        term: globalTranslate.f2b_WhitelistTooltip_format_header,
                        definition: null
                    },
                    globalTranslate.f2b_WhitelistTooltip_format_desc,
                    {
                        term: globalTranslate.f2b_WhitelistTooltip_examples_header,
                        definition: null
                    },
                    {
                        term: '192.168.1.100',
                        definition: globalTranslate.f2b_WhitelistTooltip_example_single_ip
                    },
                    {
                        term: '10.0.0.0/8',
                        definition: globalTranslate.f2b_WhitelistTooltip_example_subnet
                    },
                    {
                        term: '192.168.1.0/24',
                        definition: globalTranslate.f2b_WhitelistTooltip_example_local_network
                    },
                    {
                        term: '172.16.0.0/12',
                        definition: globalTranslate.f2b_WhitelistTooltip_example_private_network
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.f2b_WhitelistTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.f2b_WhitelistTooltip_recommendation_1,
                    globalTranslate.f2b_WhitelistTooltip_recommendation_2,
                    globalTranslate.f2b_WhitelistTooltip_recommendation_3
                ],
                examples: globalTranslate.f2b_WhitelistTooltip_config_examples ?
                    globalTranslate.f2b_WhitelistTooltip_config_examples.split('|') : [
                        '# Office network',
                        '192.168.1.0/24',
                        '',
                        '# VPN server',
                        '10.8.0.1',
                        '',
                        '# Partner IP',
                        '203.0.113.45'
                    ],
                warning: {
                    header: globalTranslate.f2b_WhitelistTooltip_warning_header,
                    text: globalTranslate.f2b_WhitelistTooltip_warning
                },
                note: globalTranslate.f2b_WhitelistTooltip_note
            },

            // Ban time field tooltip
            bantime: {
                header: globalTranslate.f2b_BanTimeTooltip_header,
                description: globalTranslate.f2b_BanTimeTooltip_desc,
                list: [
                    {
                        term: globalTranslate.f2b_BanTimeTooltip_duration_header,
                        definition: null
                    },
                    globalTranslate.f2b_BanTimeTooltip_1hour,
                    globalTranslate.f2b_BanTimeTooltip_24hours,
                    globalTranslate.f2b_BanTimeTooltip_7days
                ],
                note: globalTranslate.f2b_BanTimeTooltip_note
            },

            // Find time field tooltip
            findtime: {
                header: globalTranslate.f2b_FindTimeTooltip_header,
                description: globalTranslate.f2b_FindTimeTooltip_desc,
                list: [
                    {
                        term: globalTranslate.f2b_FindTimeTooltip_window_header,
                        definition: null
                    },
                    globalTranslate.f2b_FindTimeTooltip_10min,
                    globalTranslate.f2b_FindTimeTooltip_30min,
                    globalTranslate.f2b_FindTimeTooltip_1hour,
                    globalTranslate.f2b_FindTimeTooltip_3hours
                ],
                note: globalTranslate.f2b_FindTimeTooltip_note
            },

            // PBXFirewallMaxReqSec field tooltip
            PBXFirewallMaxReqSec: {
                header: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_header,
                description: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_desc,
                list: [
                    {
                        term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_how_it_works,
                        definition: null
                    },
                    globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_how_it_works_desc,
                    {
                        term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_values_header,
                        definition: null
                    },
                    {
                        term: '10 req/s',
                        definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_10
                    },
                    {
                        term: '30 req/s',
                        definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_30
                    },
                    {
                        term: '100 req/s',
                        definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_100
                    },
                    {
                        term: '300 req/s',
                        definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_300
                    },
                    {
                        term: '∞',
                        definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_unlimited
                    }
                ],
                list2: [
                    {
                        term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenarios_header,
                        definition: null
                    },
                    globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_1,
                    globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_2,
                    globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_3
                ],
                warning: {
                    header: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_warning_header,
                    text: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_warning
                },
                note: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_note
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