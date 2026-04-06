/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * TooltipBuilder - Utility class for building and managing tooltips
 * 
 * Provides methods for:
 * - Building HTML content for tooltips
 * - Initializing Semantic UI popup tooltips
 * - Handling various tooltip data structures
 * 
 * @module TooltipBuilder
 */
const TooltipBuilder = {
    /**
     * Build HTML content for tooltip popup
     * 
     * @param {Object} tooltipData - Configuration object for tooltip content
     * @param {string} tooltipData.header - Tooltip header text
     * @param {string} tooltipData.description - Tooltip description text
     * @param {Array} tooltipData.list - Main list of items (strings or objects with term/definition)
     * @param {Array} tooltipData.list2-list10 - Additional lists
     * @param {Object} tooltipData.warning - Warning message with header and text
     * @param {Array} tooltipData.examples - Code examples
     * @param {string} tooltipData.examplesHeader - Header for examples section
     * @param {string} tooltipData.note - Additional note text
     * @returns {string} HTML string for tooltip content
     */
    buildContent(tooltipData) {
        if (!tooltipData) return '';
        
        let html = '';
        
        // Add header if exists
        if (tooltipData.header) {
            html += `<div class="header">${tooltipData.header}</div>`;
        }
        
        // Add description if exists
        if (tooltipData.description) {
            html += `<p>${tooltipData.description}</p>`;
        }
        
        // Helper function to build list HTML
        const buildList = (list) => {
            let listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
            
            list.forEach(item => {
                if (typeof item === 'string') {
                    // Simple list item
                    listHtml += `<li>${item}</li>`;
                } else if (item.definition === null) {
                    // Section header
                    listHtml += `</ul><p><strong>${item.term}</strong></p><ul style="margin: 0.5em 0; padding-left: 1.5em;">`;
                } else {
                    // Term with definition
                    listHtml += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            
            listHtml += '</ul>';
            return listHtml;
        };
        
        // Add main list if exists
        if (tooltipData.list && tooltipData.list.length > 0) {
            html += buildList(tooltipData.list);
        }
        
        // Add additional lists (list2 through list10)
        for (let i = 2; i <= 10; i++) {
            const listKey = `list${i}`;
            if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
                html += buildList(tooltipData[listKey]);
            }
        }
        
        // Add warning if exists
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
        
        // Add examples if exist
        if (tooltipData.examples && tooltipData.examples.length > 0) {
            if (tooltipData.examplesHeader) {
                html += `<p><strong>${tooltipData.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            tooltipData.examples.forEach((line, index) => {
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
        }
        
        // Add note if exists
        if (tooltipData.note) {
            html += `<p><em>${tooltipData.note}</em></p>`;
        }
        
        return html;
    },
    
    /**
     * Initialize tooltips for form fields
     * 
     * @param {Object} tooltipConfigs - Configuration object with field names as keys and tooltip data as values
     * @param {Object} options - Additional options for popup initialization
     * @param {string} options.selector - jQuery selector for tooltip icons (default: '.field-info-icon')
     * @param {string} options.position - Popup position (default: 'top right')
     * @param {boolean} options.hoverable - Whether popup stays open on hover (default: true)
     * @param {number} options.showDelay - Delay before showing popup (default: 300)
     * @param {number} options.hideDelay - Delay before hiding popup (default: 100)
     * @param {string} options.variation - Popup variation (default: 'flowing')
     */
    initialize(tooltipConfigs, options = {}) {
        const defaults = {
            selector: '.field-info-icon',
            position: 'top right',
            hoverable: true,
            showDelay: 300,
            hideDelay: 100,
            variation: 'flowing'
        };

        const settings = Object.assign({}, defaults, options);

        // Initialize popup for each icon
        $(settings.selector).each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const tooltipData = tooltipConfigs[fieldName];

            if (tooltipData) {
                const content = typeof tooltipData === 'string' ?
                    tooltipData :
                    this.buildContent(tooltipData);

                $icon.popup({
                    html: content,
                    position: settings.position,
                    hoverable: settings.hoverable,
                    delay: {
                        show: settings.showDelay,
                        hide: settings.hideDelay
                    },
                    variation: settings.variation,
                    on: 'manual'  // Manual control for better handling inside labels
                });

                // Add click handler for manual popup control
                $icon.off('click.popup-trigger').on('click.popup-trigger', function(e) {
                    // Stop propagation to prevent label from triggering checkbox
                    e.stopPropagation();
                    e.preventDefault();

                    // Show the popup
                    $(this).popup('toggle');
                });
            }
        });

        // Note: Click prevention is handled individually for each icon in the loop above
    },
    
    /**
     * Destroy all tooltips with the given selector
     * 
     * @param {string} selector - jQuery selector for tooltip icons
     */
    destroy(selector = '.field-info-icon') {
        $(selector).popup('destroy');
    },
    
    /**
     * Hide all tooltips with the given selector
     * 
     * @param {string} selector - jQuery selector for tooltip icons
     */
    hide(selector = '.field-info-icon') {
        $(selector).popup('hide');
    },
    
    /**
     * Update tooltip content for a specific field
     *
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     * @param {string} selector - jQuery selector for finding the field icon
     */
    update(fieldName, tooltipData, selector = '.field-info-icon') {
        const $icon = $(`${selector}[data-field="${fieldName}"]`);

        if ($icon.length) {
            const content = typeof tooltipData === 'string' ?
                tooltipData :
                this.buildContent(tooltipData);

            // Destroy existing popup
            $icon.popup('destroy');

            // Create new popup with updated content
            $icon.popup({
                html: content,
                position: 'top right',
                hoverable: true,
                delay: {
                    show: 300,
                    hide: 100
                },
                variation: 'flowing',
                on: 'manual'
            });

            // Add click handler for manual popup control
            $icon.off('click.popup-trigger').on('click.popup-trigger', function(e) {
                e.stopPropagation();
                e.preventDefault();
                $(this).popup('toggle');
            });
        }
    },


};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TooltipBuilder;
}

// Initialize global click prevention for all tooltip icons
// This will work for dynamically added elements too
$(document).ready(() => {
    // Use event delegation for all current and future tooltip icon elements
    // Supports multiple icon classes: field-info-icon, special-checkbox-info, service-info-icon
    const tooltipIconSelector = '.field-info-icon, .special-checkbox-info, .service-info-icon';

    $(document).off('click.global-tooltip').on('click.global-tooltip', tooltipIconSelector, function(e) {
        const $label = $(this).closest('label');
        if ($label.length > 0) {
            // Stop propagation to prevent label from toggling checkbox
            e.stopPropagation();
            e.preventDefault();
        }
    });
});