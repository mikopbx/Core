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
 * IncomingRouteTooltipManager - Manages tooltips for Incoming Route form fields
 *
 * This class provides tooltip configurations for incoming route settings fields,
 * helping users understand routing rules, number matching patterns, and call handling.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for routing rules
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and priorities
 *
 * @class IncomingRouteTooltipManager
 */
class IncomingRouteTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('IncomingRouteTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Initialize all tooltips for the incoming route form
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
            // Failed to initialize incoming route tooltips
        }
    }

    /**
     * Get all tooltip configurations for incoming route fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */
    static getTooltipConfigurations() {
        return {
            // Provider tooltip
            provider: {
                header: globalTranslate.ir_provider_tooltip_header,
                description: globalTranslate.ir_provider_tooltip_desc,
                list: [
                    globalTranslate.ir_provider_tooltip_item1,
                    globalTranslate.ir_provider_tooltip_item2,
                    {
                        term: globalTranslate.ir_provider_tooltip_priority_header,
                        definition: null
                    },
                    globalTranslate.ir_provider_tooltip_priority1,
                    globalTranslate.ir_provider_tooltip_priority2
                ],
                note: globalTranslate.ir_provider_tooltip_example
            },

            // Number matching tooltip
            number: {
                header: globalTranslate.ir_number_tooltip_header,
                description: globalTranslate.ir_number_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_number_tooltip_types_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_type1,
                    globalTranslate.ir_number_tooltip_type2,
                    globalTranslate.ir_number_tooltip_type3,
                    globalTranslate.ir_number_tooltip_type4,
                    {
                        term: globalTranslate.ir_number_tooltip_masks_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_mask1,
                    globalTranslate.ir_number_tooltip_mask2,
                    globalTranslate.ir_number_tooltip_mask3,
                    globalTranslate.ir_number_tooltip_mask4,
                    globalTranslate.ir_number_tooltip_mask5
                ],
                list2: [
                    {
                        term: globalTranslate.ir_number_tooltip_priority_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_priority1,
                    globalTranslate.ir_number_tooltip_priority2,
                    globalTranslate.ir_number_tooltip_priority3,
                    globalTranslate.ir_number_tooltip_priority4
                ],
                note: globalTranslate.ir_number_tooltip_note
            },

            // Audio message tooltip
            audio_message_id: {
                header: globalTranslate.ir_audio_message_id_tooltip_header,
                description: globalTranslate.ir_audio_message_id_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_when_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_when1,
                    globalTranslate.ir_audio_message_id_tooltip_when2,
                    globalTranslate.ir_audio_message_id_tooltip_when3
                ],
                list2: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_targets_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_target1,
                    globalTranslate.ir_audio_message_id_tooltip_target2,
                    globalTranslate.ir_audio_message_id_tooltip_target3,
                    globalTranslate.ir_audio_message_id_tooltip_target4
                ],
                list3: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_example1,
                    globalTranslate.ir_audio_message_id_tooltip_example2,
                    globalTranslate.ir_audio_message_id_tooltip_example3
                ]
            },

            // Timeout tooltip
            timeout: {
                header: globalTranslate.ir_timeout_tooltip_header,
                description: globalTranslate.ir_timeout_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_behavior_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_behavior1,
                    globalTranslate.ir_timeout_tooltip_behavior2,
                    globalTranslate.ir_timeout_tooltip_behavior3,
                    globalTranslate.ir_timeout_tooltip_behavior4
                ],
                list2: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_values_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_value1,
                    globalTranslate.ir_timeout_tooltip_value2,
                    globalTranslate.ir_timeout_tooltip_value3
                ],
                list3: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_chain_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_chain1,
                    globalTranslate.ir_timeout_tooltip_chain2,
                    globalTranslate.ir_timeout_tooltip_chain3
                ]
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
     * Destroy all incoming route tooltips
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
            console.error('Failed to destroy incoming route tooltips:', error);
        }
    }
}

// Export for use in incoming-route-modify.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IncomingRouteTooltipManager;
}
