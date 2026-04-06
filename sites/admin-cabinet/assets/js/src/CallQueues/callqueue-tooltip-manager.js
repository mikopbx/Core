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
 * CallQueueTooltipManager - Manages tooltips for Call Queue form fields
 *
 * This class provides tooltip configurations for call queue settings fields,
 * helping users understand queue behavior parameters and their implications.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for queue settings
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and recommendations
 *
 * @class CallQueueTooltipManager
 */
class CallQueueTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('CallQueueTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Initialize all tooltips for the call queue form
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
            // Failed to initialize call queue tooltips
        }
    }

    /**
     * Get all tooltip configurations for call queue fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */
    static getTooltipConfigurations() {
        return {
            // Caller ID prefix tooltip
            callerid_prefix: {
                header: globalTranslate.cq_CallerIDPrefixTooltip_header,
                description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats
                ],
                list2: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_example
                ],
                list3: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_examples
                ],
                note: globalTranslate.cq_CallerIDPrefixTooltip_note
            },

            // Seconds to ring each member tooltip
            seconds_to_ring_each_member: {
                header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
                description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
                        definition: null
                    },
                    `${globalTranslate.cq_SecondsToRingEachMemberTooltip_linear} - ${globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc}`,
                    `${globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall} - ${globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc}`
                ],
                list2: [
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long
                ],
                note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
            },

            // Seconds for wrapup tooltip
            seconds_for_wrapup: {
                header: globalTranslate.cq_SecondsForWrapupTooltip_header,
                description: globalTranslate.cq_SecondsForWrapupTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_SecondsForWrapupTooltip_purposes_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_notes,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_crm,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_prepare,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_break
                ],
                list2: [
                    {
                        term: globalTranslate.cq_SecondsForWrapupTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_none,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_short,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_medium,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_long
                ],
                note: globalTranslate.cq_SecondsForWrapupTooltip_note
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
     * Destroy all call queue tooltips
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
            console.error('Failed to destroy call queue tooltips:', error);
        }
    }
}

// Export for use in callqueue-modify.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallQueueTooltipManager;
}
