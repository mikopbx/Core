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

/* global $ */

/**
 * FormElements - Advanced form element initialization and management
 * 
 * Provides intelligent initialization and optimization for form elements including:
 * - Smart textarea auto-resizing with scroll detection
 * - Form element state management
 * - Dynamic element behavior optimization
 * 
 * @module FormElements
 */
const FormElements = {

    /**
     * Initialize all form elements with intelligent behavior
     * @param {jQuery|string} containerSelector - Container selector or jQuery object
     */
    initialize(containerSelector = 'body') {
        const $container = $(containerSelector);
        
        // Initialize textareas with auto-resize
        FormElements.initializeTextareas($container);
        
        // Initialize other form elements as needed
        // FormElements.initializeDropdowns($container);
        // FormElements.initializeCheckboxes($container);
    },

    /**
     * Initialize textareas with intelligent auto-resize behavior
     * @param {jQuery} $container - Container to search for textareas
     */
    initializeTextareas($container) {
        const $textareas = $container.find('textarea');
        
        $textareas.each(function() {
            const $textarea = $(this);
            
            // Skip if already initialized
            if ($textarea.data('formelements-initialized')) {
                return;
            }
            
            // Mark as initialized
            $textarea.data('formelements-initialized', true);
            
            // Initial resize
            FormElements.optimizeTextareaSize($textarea);
            
            // Add event listeners for dynamic resizing
            $textarea.on('input paste keyup', function() {
                FormElements.optimizeTextareaSize($(this));
            });
        });
    },

    /**
     * Optimize textarea size - simple approach: calculate width, count lines, adjust height
     * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
     * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
     */
    optimizeTextareaSize(textareaSelector, areaWidth = null) {
        const $textareas = $(textareaSelector);
        
        $textareas.each(function() {
            const $textarea = $(this);
            const content = $textarea.val() || '';
            
            if (!content) {
                // Empty content - set minimum rows
                $textarea.attr('rows', 2);
                return;
            }
            
            // Step 1: Calculate field width in characters
            const fieldWidth = areaWidth || FormElements.calculateTextareaWidth($textarea);
            
            // Step 2: Count lines needed for the content
            const lines = content.split('\n');
            let totalRows = 0;
            
            lines.forEach(line => {
                if (line.length === 0) {
                    totalRows += 1; // Empty line = 1 row
                } else {
                    totalRows += Math.ceil(line.length / fieldWidth); // Wrapped lines
                }
            });
            
            // Step 3: Apply constraints and adjust height
            const minRows = 2;
            const maxRows = 15;
            const optimalRows = Math.max(minRows, Math.min(totalRows, maxRows));
            
            // Set the calculated height
            $textarea.attr('rows', optimalRows);
        });
    },


    /**
     * Calculate textarea width in characters based on actual CSS dimensions
     * @param {jQuery} $textarea - jQuery textarea element
     * @returns {number} - Approximate width in characters
     */
    calculateTextareaWidth($textarea) {
        // Create a temporary element to measure character width
        const $temp = $('<span>')
            .css({
                'font-family': $textarea.css('font-family'),
                'font-size': $textarea.css('font-size'),
                'font-weight': $textarea.css('font-weight'),
                'letter-spacing': $textarea.css('letter-spacing'),
                'visibility': 'hidden',
                'position': 'absolute',
                'white-space': 'nowrap'
            })
            .text('M') // Use 'M' as it's typically the widest character
            .appendTo('body');
        
        const charWidth = $temp.width();
        $temp.remove();
        
        // Get textarea's content width (excluding padding and borders)
        const textareaWidth = $textarea.innerWidth() - 
            parseInt($textarea.css('padding-left'), 10) - 
            parseInt($textarea.css('padding-right'), 10);
        
        // Calculate approximate character count, with a small buffer for accuracy
        const approximateCharWidth = Math.floor(textareaWidth / charWidth) - 2;
        
        // Ensure minimum width and reasonable maximum
        return Math.max(20, Math.min(approximateCharWidth, 200));
    },

    /**
     * Initialize auto-resize for textarea elements
     * @param {string} selector - CSS selector for textareas to auto-resize
     * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
     */
    initAutoResizeTextAreas(selector = 'textarea', areaWidth = null) {
        const $textareas = $(selector);
        
        // Initial resize
        FormElements.optimizeTextareaSize($textareas, areaWidth);
        
        // Add event listeners for dynamic resizing
        $textareas.on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this), areaWidth);
        });
    },

    /**
     * Reset textarea to optimal size (useful after form data changes)
     * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
     */
    resetTextareaSize(textareaSelector) {
        FormElements.optimizeTextareaSize(textareaSelector);
    },

    /**
     * Get optimal rows count for textarea content
     * @param {jQuery} $textarea - jQuery textarea element
     * @returns {number} - Optimal number of rows
     */
    getOptimalRows($textarea) {
        const content = $textarea.val() || $textarea.attr('placeholder') || '';
        if (!content) return 2;
        
        const calculatedWidth = FormElements.calculateTextareaWidth($textarea);
        const lines = content.split('\n');
        let idealRows = 0;
        
        lines.forEach(line => {
            const lineRows = Math.max(1, Math.ceil(line.length / calculatedWidth));
            idealRows += lineRows;
        });
        
        return Math.max(2, Math.min(idealRows, 15));
    },

    /**
     * Enable/disable auto-resize for specific textarea
     * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
     * @param {boolean} enable - Enable or disable auto-resize
     */
    toggleAutoResize(textareaSelector, enable = true) {
        const $textareas = $(textareaSelector);
        
        if (enable) {
            $textareas.on('input paste keyup', function() {
                FormElements.optimizeTextareaSize($(this));
            });
        } else {
            $textareas.off('input paste keyup');
        }
    }
};

// Auto-initialize on document ready
$(document).ready(function() {
    // Initialize form elements in the entire document
    FormElements.initialize();
});

// Export for use in other modules
// export default FormElements;