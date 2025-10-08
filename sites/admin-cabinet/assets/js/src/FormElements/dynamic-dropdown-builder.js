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

/* global $, Form, globalTranslate, SecurityUtils */

/**
 * DynamicDropdownBuilder - Universal dropdown builder for MikoPBX V5.0
 * 
 * Builds dropdown HTML dynamically based on REST API data.
 * Separates concerns: PHP forms only provide hidden inputs, 
 * JavaScript builds UI and populates with data.
 * 
 * Usage:
 * DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
 *     apiUrl: '/pbxcore/api/v2/network-filters/getForSelect',
 *     placeholder: 'Select network filter'
 * });
 */
const DynamicDropdownBuilder = {
    
    /**
     * Build dropdown for a field based on REST API data
     * @param {string} fieldName - Field name (e.g., 'networkfilterid')
     * @param {object} data - Data from REST API
     * @param {object} config - Dropdown configuration
     */
    buildDropdown(fieldName, data, config = {}) {
        const $hiddenInput = $(`#${fieldName}`);
        
        if (!$hiddenInput.length) {
            console.warn(`Hidden input not found for field: ${fieldName}`);
            return;
        }
        
        // Check if dropdown already exists - update it instead of creating duplicate
        const $existingDropdown = $(`#${fieldName}-dropdown`);
        if ($existingDropdown.length) {
            this.updateExistingDropdown(fieldName, data, config);
            return;
        }
        
        // Get current values from data
        const currentValue = data[fieldName] || config.defaultValue || '';
        const representField = `${fieldName}_represent`;
        
        // Try multiple possible represent field names for flexibility
        let currentText = data[representField];
        
        if (!currentText) {
            // Try without 'id' suffix (e.g., networkfilter_represent instead of networkfilterid_represent)
            const baseFieldName = fieldName.replace(/id$/, '');
            const alternativeRepresentField = `${baseFieldName}_represent`;
            currentText = data[alternativeRepresentField];
        }
        
        // If we have a value but no represent text, try to find it in static options first
        if (currentValue && !currentText && config.staticOptions) {
            const matchingOption = config.staticOptions.find(option => option.value === currentValue);
            if (matchingOption) {
                currentText = matchingOption.text || matchingOption.name;
            }
        }
        
        // Sanitize HTML in represent text using SecurityUtils
        if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
            // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
            currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
        }
        
        // Check if we're using placeholder text
        const isUsingPlaceholder = !currentText;

        // Fallback to placeholder or default
        currentText = currentText || config.placeholder || 'Select value';

        // Build CSS classes with sanitization
        // Allow custom base classes or use default with 'selection'
        const defaultBaseClasses = ['ui', 'selection', 'dropdown'];
        const baseClasses = config.baseClasses || defaultBaseClasses;
        const additionalClasses = config.additionalClasses || [];
        const allClasses = [...baseClasses, ...additionalClasses].join(' ');

        // Build dropdown HTML - FIXED: Create elements with jQuery to properly handle HTML content
        // Only show current value in text display, let API populate menu on click
        // Use 'default' class when showing placeholder, even if there's a value
        const textClass = isUsingPlaceholder ? 'text default' : 'text';
        
        // Sanitize fieldName for use in ID attribute
        const safeFieldName = typeof SecurityUtils !== 'undefined' 
            ? SecurityUtils.sanitizeAttribute(fieldName)
            : fieldName;
        
        // Create dropdown structure using jQuery for proper HTML handling
        const $dropdown = $('<div>')
            .addClass(allClasses)
            .attr('id', `${safeFieldName}-dropdown`);
        
        const $textDiv = $('<div>')
            .addClass(textClass)
            .html(currentText); // currentText already sanitized above
        
        const $dropdownIcon = $('<i>').addClass('dropdown icon');
        
        const $menu = $('<div>')
            .addClass('menu')
            .html('<!-- Menu intentionally empty - will be populated by API on click -->');
        
        // Assemble dropdown
        $dropdown.append($textDiv, $dropdownIcon, $menu);
        
        // Insert dropdown after hidden input
        $dropdown.insertAfter($hiddenInput);
        
        // Set value in hidden input
        $hiddenInput.val(currentValue);
        
        // Initialize dropdown
        this.initializeDropdown(fieldName, config);
    },
    
    /**
     * Update existing dropdown with new configuration
     * @param {string} fieldName - Field name
     * @param {object} data - Data for the dropdown
     * @param {object} config - New configuration to apply
     */
    updateExistingDropdown(fieldName, data, config) {
        const $dropdown = $(`#${fieldName}-dropdown`);
        const $hiddenInput = $(`#${fieldName}`);
        
        if (!$dropdown.length) {
            console.warn(`Cannot update: dropdown not found for field: ${fieldName}`);
            return;
        }
        
        // Update hidden input value if provided
        const currentValue = data[fieldName] || config.defaultValue || '';
        if (currentValue) {
            $hiddenInput.val(currentValue);
        }
        
        // Update dropdown text if represent field is provided
        const representField = `${fieldName}_represent`;
        let currentText = data[representField];
        if (!currentText) {
            const baseFieldName = fieldName.replace(/id$/, '');
            const alternativeRepresentField = `${baseFieldName}_represent`;
            currentText = data[alternativeRepresentField];
        }
        
        // Sanitize HTML in represent text using SecurityUtils (consistent with buildDropdown)
        if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
            // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
            currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
        }
        
        if (currentText) {
            const $textElement = $dropdown.find('.text');
            $textElement.html(currentText);
            $textElement.removeClass('default');
        }
        
        // Re-initialize dropdown with new configuration
        this.initializeDropdown(fieldName, config);
    },
    
    /**
     * Initialize dropdown with API or static data
     * @param {string} fieldName - Field name
     * @param {object} config - Configuration object
     */
    initializeDropdown(fieldName, config) {
        const $dropdown = $(`#${fieldName}-dropdown`);
        const $hiddenInput = $(`#${fieldName}`);
        
        if (!$dropdown.length) {
            console.warn(`Dropdown not found: ${fieldName}-dropdown`);
            return;
        }
        
        
        const settings = {
            allowAdditions: false,
            fullTextSearch: true,
            forceSelection: false,
            preserveHTML: true, // Allow HTML in dropdown text (for icons, flags, etc.)
            
            onChange: (value, text, $choice) => {
                // Automatic synchronization with hidden input
                $hiddenInput.val(value);
                
                // Trigger change event on hidden input for form validation/processing
                $hiddenInput.trigger('change');
                
                // Notify form of changes
                if (typeof Form !== 'undefined' && Form.dataChanged) {
                    Form.dataChanged();
                }
                
                // Custom onChange handler - only for field-specific logic
                if (config.onChange) {
                    config.onChange(value, text, $choice);
                }
            }
        };
        
        // Add API settings if provided
        if (config.apiUrl) {
            // Check if dropdown has search functionality - detect by CSS classes since search input is added by Fomantic UI later
            const hasSearchInput = $dropdown.hasClass('search');
            
            let apiUrl = config.apiUrl;
            
            // Only add query parameter for searchable dropdowns
            if (hasSearchInput) {
                if (config.apiUrl.indexOf('?') > -1) {
                    apiUrl += '&query={query}';
                } else {
                    apiUrl += '?query={query}';
                }
            }
            
            settings.apiSettings = {
                url: apiUrl,
                cache: config.cache !== undefined ? config.cache : true,
                throttle: hasSearchInput ? 500 : 0,
                throttleFirstRequest: false,
                filterRemoteData: true,
                minCharacters: hasSearchInput ? 3 : 0, // Search dropdowns need 3 characters, simple dropdowns work on click
                
                onResponse: (response) => {
                    return config.onResponse 
                        ? config.onResponse(response) 
                        : this.defaultResponseHandler(response);
                },
                
                onFailure: (response) => {
                    console.error(`❌ API request failed for ${fieldName} (${config.apiUrl}):`, response);
                }
            };
            
            
            // Add additional API parameters if provided
            if (config.apiParams && typeof config.apiParams === 'object') {
                const params = new URLSearchParams(config.apiParams);
                const existingParams = params.toString();
                
                if (existingParams) {
                    if (apiUrl.indexOf('?') > -1) {
                        const queryIndex = apiUrl.indexOf('query={query}');
                        if (queryIndex > -1) {
                            apiUrl = apiUrl.substring(0, queryIndex) + existingParams + '&query={query}';
                        } else {
                            apiUrl += '&' + existingParams;
                        }
                    } else {
                        // Only add query parameter if the dropdown is searchable
                        if (hasSearchInput) {
                            apiUrl += '?' + existingParams + '&query={query}';
                        } else {
                            apiUrl += '?' + existingParams;
                        }
                    }

                    settings.apiSettings.url = apiUrl;
                }
            }
            
            // Use custom template to properly render HTML content
            if (!config.templates) {
                settings.templates = {
                    menu: this.customDropdownMenu
                };
            } else {
                settings.templates = config.templates;
            }
        } else if (config.staticOptions) {
            // For static options, populate menu immediately
            this.populateStaticOptions($dropdown, config.staticOptions);
        }

        // Initialize native Fomantic UI dropdown
        $dropdown.dropdown(settings);
    },
    
    /**
     * Default API response handler for MikoPBX format
     * @param {object} response - API response
     * @returns {object} Fomantic UI compatible response
     */
    defaultResponseHandler(response) {
        if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
            return {
                success: true,
                results: response.data.map(item => {
                    const rawText = item.represent || item.name || item.text;
                    // Sanitize display text while preserving safe HTML (icons)
                    const safeText = typeof SecurityUtils !== 'undefined' 
                        ? SecurityUtils.sanitizeObjectRepresentations(rawText)
                        : rawText;
                    
                    return {
                        value: item.value,
                        text: safeText,
                        name: safeText
                    };
                })
            };
        }
        return { 
            success: false, 
            results: [] 
        };
    },
    
    /**
     * Custom dropdown menu template for proper HTML rendering
     * @param {object} response - Response from API
     * @param {object} fields - Field configuration
     * @returns {string} HTML for dropdown menu
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        
        values.forEach(option => {
            const value = option[fields.value] || '';
            const text = option[fields.text] || option[fields.name] || '';
            
            html += `<div class="item" data-value="${DynamicDropdownBuilder.escapeHtml(value)}">`;
            html += text;
            html += '</div>';
        });
        
        return html;
    },
    
    /**
     * Populate dropdown with static options
     * @param {jQuery} $dropdown - Dropdown element
     * @param {Array} options - Static options array
     */
    populateStaticOptions($dropdown, options) {
        const $menu = $dropdown.find('.menu');
        
        options.forEach(option => {
            const rawValue = option.value;
            const rawText = option.text || option.name;
            
            // Sanitize value for attribute and text for display
            const safeValue = typeof SecurityUtils !== 'undefined' 
                ? SecurityUtils.sanitizeAttribute(rawValue)
                : this.escapeHtml(rawValue);
            const safeText = typeof SecurityUtils !== 'undefined' 
                ? SecurityUtils.sanitizeObjectRepresentations(rawText)
                : rawText;
            
            $menu.append(`<div class="item" data-value="${safeValue}">${safeText}</div>`);
        });
    },
    
    /**
     * Build multiple dropdowns from configuration object
     * @param {object} data - Data from REST API
     * @param {object} configs - Configuration for each field
     */
    buildMultipleDropdowns(data, configs) {
        Object.keys(configs).forEach(fieldName => {
            this.buildDropdown(fieldName, data, configs[fieldName]);
        });
    },
    
    /**
     * Set value in existing dropdown
     * @param {string} fieldName - Field name
     * @param {string} value - Value to set
     */
    setValue(fieldName, value) {
        const $dropdown = $(`#${fieldName}-dropdown`);
        if ($dropdown.length) {
            $dropdown.dropdown('set selected', value);
        }
    },
    
    /**
     * Get current dropdown value
     * @param {string} fieldName - Field name
     * @returns {string} Current value
     */
    getValue(fieldName) {
        const $dropdown = $(`#${fieldName}-dropdown`);
        return $dropdown.length ? $dropdown.dropdown('get value') : '';
    },
    
    /**
     * Clear dropdown selection
     * @param {string} fieldName - Field name
     */
    clear(fieldName) {
        const $dropdown = $(`#${fieldName}-dropdown`);
        if ($dropdown.length) {
            $dropdown.dropdown('clear');
        }
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicDropdownBuilder;
}