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

/* global $, UserMessage, globalTranslate */

/**
 * SemanticUIDropdownComponent - Simplified dropdown component (V3.0)
 * 
 * Lightweight wrapper around native Fomantic UI dropdown with API support.
 * No complex state management - uses native Fomantic UI apiSettings.
 * 
 * Usage:
 * SemanticUIDropdownComponent.init('#my-dropdown', {
 *     apiUrl: '/api/extensions/getForSelect',
 *     onChange: (value) => { // handle selection
 *     }
 * });
 */
const SemanticUIDropdownComponent = {
    
    /**
     * Initialize dropdown with native Fomantic UI (SIMPLIFIED)
     * @param {string|jQuery} selector - Dropdown selector
     * @param {object} config - Configuration options
     * @returns {jQuery|null} Initialized dropdown element
     */
    init(selector, config = {}) {
        const $dropdown = $(selector);
        if (!$dropdown.length) {
            console.error(`Dropdown not found: ${selector}`);
            return null;
        }
        
        // Build native Fomantic UI settings
        const settings = {
            onChange: config.onChange || function() {},
            onShow: config.onShow || function() {}
        };
        
        // Add API settings if provided
        if (config.apiUrl) {
            settings.apiSettings = {
                url: config.apiUrl,
                cache: config.cache || false,  // Fresh data by default
                onResponse: config.onResponse || function(response) {
                    // Default response processing for MikoPBX API format
                    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
                        return {
                            success: true,
                            results: response.data.map(item => ({
                                value: item.value,
                                text: item.represent || item.name || item.text
                            }))
                        };
                    }
                    // Return error format if API failed
                    return {
                        success: false,
                        results: []
                    };
                }
            };
        }
        
        // Initialize native Fomantic UI dropdown
        $dropdown.dropdown(settings);
        
        return $dropdown;
    },
    
    /**
     * Simple helper methods (native Fomantic UI wrappers)
     */
    
    setValue(selector, value) {
        $(selector).dropdown('set selected', value);
    },
    
    getValue(selector) {
        return $(selector).dropdown('get value');
    },
    
    clear(selector) {
        $(selector).dropdown('clear');
    },
    
    refresh(selector) {
        $(selector).dropdown('refresh');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SemanticUIDropdownComponent;
}