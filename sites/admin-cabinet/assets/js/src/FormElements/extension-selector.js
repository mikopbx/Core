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

/* global $, globalTranslate, DynamicDropdownBuilder, SecurityUtils, Form */

/**
 * ExtensionSelector - Extension-specific wrapper over DynamicDropdownBuilder
 * 
 * This component builds upon DynamicDropdownBuilder to provide extension-specific features:
 * - Support for extension types/categories (routing, internal, all, etc.)
 * - Proper HTML rendering for extension names with icons
 * - Extension exclusion functionality
 * - Optimized caching for extension data
 * - Full-text search capabilities
 * 
 * Usage:
 * ExtensionSelector.init('extension', {
 *     type: 'routing',              // Extension type (routing/internal/all)
 *     excludeExtensions: ['101'],   // Extensions to exclude
 *     includeEmpty: true,           // Include empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module ExtensionSelector
 */
const ExtensionSelector = {
    
    /**
     * Active selector instances
     * @type {Map}
     */
    instances: new Map(),
    
    /**
     * Default configuration
     * @type {object}
     */
    defaults: {
        type: 'all',              // Extension type (all/routing/internal/queue/etc.)
        excludeExtensions: [],    // Extensions to exclude from list
        includeEmpty: false,      // Include empty/none option
        placeholder: null,        // Placeholder text (auto-detected)
        additionalClasses: [],    // Additional CSS classes for dropdown
        onChange: null,          // Change callback function
        onLoadComplete: null,    // Load complete callback
    },
    
    /**
     * Initialize extension selector
     * 
     * @param {string} fieldId - Field ID (e.g., 'extension')
     * @param {object} options - Configuration options
     * @returns {object|null} Selector instance
     */
    init(fieldId, options = {}) {
        // Check if already initialized
        if (this.instances.has(fieldId)) {
            return this.instances.get(fieldId);
        }
        
        // Find hidden input element
        const $hiddenInput = $(`#${fieldId}`);
        if (!$hiddenInput.length) {
            console.warn(`ExtensionSelector: Hidden input not found for field: ${fieldId}`);
            return null;
        }
        
        // Merge options with defaults
        const config = { ...this.defaults, ...options };
        
        // Get current value and represent text from data object if provided
        const currentValue = (options.data && options.data[fieldId]) || $hiddenInput.val() || '';
        const currentText = this.detectInitialText(fieldId, options.data) || config.placeholder;
        
        // Build API URL with parameters
        let apiUrl = '/pbxcore/api/extensions/getForSelect';
        const apiParams = {};
        
        // Add type parameter
        if (config.type && config.type !== 'all') {
            apiParams.type = config.type;
        }
        
        // Add exclude parameter
        if (config.excludeExtensions && config.excludeExtensions.length > 0) {
            apiParams.exclude = config.excludeExtensions.join(',');
        }
        
        // Create dropdown configuration for DynamicDropdownBuilder
        const dropdownConfig = {
            apiUrl: apiUrl,
            apiParams: apiParams,
            placeholder: config.placeholder || this.getPlaceholderByType(config.type),
            
            // Custom response handler for extension-specific processing
            onResponse: (response) => {
                return this.processExtensionResponse(response, config);
            },
            
            onChange: (value, text, $choice) => {
                this.handleSelectionChange(fieldId, value, text, $choice, config);
            }
        };
        
        
        // Add empty option if needed
        if (config.includeEmpty) {
            dropdownConfig.emptyOption = {
                key: '',
                value: globalTranslate.ex_SelectExtension || 'Select extension'
            };
        }
        
        // Pass the original data object directly to DynamicDropdownBuilder
        // This ensures proper handling of existing values and their representations
        const dropdownData = options.data || {};
        
        // Override template for proper HTML rendering
        dropdownConfig.templates = {
            menu: this.customDropdownMenu
        };
        
        // Add default classes for extension dropdowns
        dropdownConfig.additionalClasses = ['search', ...(config.additionalClasses || [])];
        
        DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig);
        
        // Create instance
        const instance = {
            fieldId,
            config,
            currentValue,
            currentText,
            $hiddenInput
        };
        
        // Store instance
        this.instances.set(fieldId, instance);
        
        return instance;
    },
    
    /**
     * Detect initial text from data object or dropdown
     * 
     * @param {string} fieldId - Field ID
     * @param {object} data - Data object with represent fields
     * @returns {string|null} Initial text
     */
    detectInitialText(fieldId, data) {
        if (data && data[`${fieldId}_represent`]) {
            return data[`${fieldId}_represent`];
        }
        
        // Try to get from existing dropdown text
        const $dropdown = $(`#${fieldId}-dropdown`);
        if ($dropdown.length) {
            const $text = $dropdown.find('.text:not(.default)');
            if ($text.length && $text.text().trim()) {
                return $text.html();
            }
        }
        
        return null;
    },
    
    /**
     * Get appropriate placeholder text by extension type
     * 
     * @param {string} type - Extension type
     * @returns {string} Placeholder text
     */
    getPlaceholderByType(type) {
        switch (type) {
            case 'routing':
                return globalTranslate.ex_SelectExtension || 'Select extension';
            case 'internal':
                return globalTranslate.ex_SelectInternalExtension || 'Select internal extension';
            case 'queue':
                return globalTranslate.ex_SelectQueueExtension || 'Select queue extension';
            default:
                return globalTranslate.ex_SelectExtension || 'Select extension';
        }
    },
    
    /**
     * Process API response for extension-specific formatting
     * 
     * @param {object} response - API response
     * @param {object} config - Configuration
     * @returns {object} Processed response
     */
    processExtensionResponse(response, config) {
        if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
            const processedResults = response.data.map(item => {
                let displayText = item.represent || item.name || item.text || item.value;
                
                // Apply HTML sanitization for extension content with icons
                if (displayText && typeof SecurityUtils !== 'undefined') {
                    displayText = SecurityUtils.sanitizeExtensionsApiContent(displayText);
                }
                
                return {
                    value: item.value || item.id,
                    text: displayText,
                    name: displayText,
                    type: item.type || '',
                    typeLocalized: item.typeLocalized || '',
                    disabled: item.disabled || false
                };
            });
            
            return {
                success: true,
                results: processedResults
            };
        }
        
        return { 
            success: false, 
            results: [] 
        };
    },
    
    /**
     * Handle dropdown selection change
     * 
     * @param {string} fieldId - Field ID
     * @param {string} value - Selected value
     * @param {string} text - Selected text
     * @param {jQuery} $choice - Selected choice element
     * @param {object} config - Configuration
     */
    handleSelectionChange(fieldId, value, text, $choice, config) {
        const instance = this.instances.get(fieldId);
        if (!instance) return;
        
        // Update instance state
        instance.currentValue = value;
        instance.currentText = text;
        
        // CRITICAL: Update hidden input field to maintain synchronization
        const $hiddenInput = $(`#${fieldId}`);
        if ($hiddenInput.length) {
            $hiddenInput.val(value);
        }
        
        // Call custom onChange if provided
        if (typeof config.onChange === 'function') {
            config.onChange(value, text, $choice);
        }
        
        // Notify form of changes
        if (typeof Form !== 'undefined' && Form.dataChanged) {
            Form.dataChanged();
        }
    },
    
    /**
     * Custom dropdown menu template with categories support
     * Synchronized with Extensions.customDropdownMenu logic for compatibility
     * 
     * @param {object} response - Response from API
     * @param {object} fields - Field configuration
     * @returns {string} HTML for dropdown menu
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || [];
        let html = '';
        let oldType = '';
        
        // Use $.each for compatibility with original Extensions.customDropdownMenu
        $.each(values, (index, option) => {
            const value = option[fields.value] || '';
            const text = option[fields.text] || option[fields.name] || '';
            const type = option.type || '';
            const typeLocalized = option.typeLocalized || '';
            
            // Add category header if type changed - exact same logic as Extensions.customDropdownMenu
            if (type !== oldType) {
                oldType = type;
                html += '<div class="divider"></div>';
                html += '\t<div class="header">';
                html += '\t<i class="tags icon"></i>';
                html += typeLocalized;
                html += '</div>';
            }
            
            // For Fomantic UI to work correctly with HTML content, data-text should contain the HTML
            // that will be displayed when the item is selected. Text is already sanitized in processExtensionResponse.
            const maybeText = text ? `data-text="${text.replace(/"/g, '&quot;')}"` : '';
            const maybeDisabled = option.disabled ? 'disabled ' : '';
            
            html += `<div class="${maybeDisabled}item" data-value="${ExtensionSelector.escapeHtml(value)}"${maybeText}>`;
            html += text; // Text is already sanitized in processExtensionResponse
            html += '</div>';
        });
        
        return html;
    },
    
    /**
     * Set value programmatically
     * 
     * @param {string} fieldId - Field ID
     * @param {string} value - Value to set
     * @param {string} text - Display text (optional)
     */
    setValue(fieldId, value, text = null) {
        const instance = this.instances.get(fieldId);
        if (!instance) {
            console.warn(`ExtensionSelector: Instance not found for field: ${fieldId}`);
            return;
        }
        
        // Use DynamicDropdownBuilder to set the value
        DynamicDropdownBuilder.setValue(fieldId, value);
        
        // Update instance state
        instance.currentValue = value;
        instance.currentText = text || '';
    },
    
    /**
     * Get current value
     * 
     * @param {string} fieldId - Field ID
     * @returns {string|null} Current value
     */
    getValue(fieldId) {
        const instance = this.instances.get(fieldId);
        return instance ? instance.currentValue : null;
    },
    
    /**
     * Clear dropdown selection
     * 
     * @param {string} fieldId - Field ID
     */
    clear(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance) {
            // Use DynamicDropdownBuilder to clear
            DynamicDropdownBuilder.clear(fieldId);
            
            // Update instance state
            instance.currentValue = null;
            instance.currentText = null;
        }
    },
    
    /**
     * Refresh dropdown data
     * 
     * @param {string} fieldId - Field ID
     */
    refresh(fieldId) {
        // Delegate to DynamicDropdownBuilder
        const $dropdown = $(`#${fieldId}-dropdown`);
        if ($dropdown.length) {
            $dropdown.dropdown('refresh');
        }
    },
    
    /**
     * Clear cache for extensions API
     * Call this after extension operations (add/edit/delete)
     * @param {string} type - Optional: specific type to clear ('routing', 'internal', etc.)
     */
    clearCache(type = null) {
        if (type) {
            // Clear cache for specific type
            DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', { type });
        } else {
            // Clear all extensions cache
            DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect');
        }
    },
    
    /**
     * Refresh all extension dropdowns on the page
     * This will force them to reload data from server
     * @param {string} type - Optional: specific type to refresh ('routing', 'internal', etc.)
     */
    refreshAll(type = null) {
        // Clear cache first
        this.clearCache(type);
        
        // Refresh each active instance
        this.instances.forEach((instance, fieldId) => {
            if (!type || instance.config.type === type) {
                // Clear dropdown and reload
                DynamicDropdownBuilder.clear(fieldId);
                
                // Reinitialize dropdown to trigger new API request
                const $dropdown = $(`#${fieldId}-dropdown`);
                if ($dropdown.length) {
                    $dropdown.dropdown('refresh');
                }
            }
        });
    },
    
    /**
     * Update extension exclusion list for existing instance
     * 
     * @param {string} fieldId - Field ID
     * @param {Array} excludeExtensions - Extensions to exclude
     */
    updateExclusions(fieldId, excludeExtensions = []) {
        const instance = this.instances.get(fieldId);
        if (!instance) {
            console.warn(`ExtensionSelector: Instance not found for field: ${fieldId}`);
            return;
        }
        
        // Update configuration
        instance.config.excludeExtensions = excludeExtensions;
        
        // Clear cache for this specific configuration
        const cacheKey = this.generateCacheKey(instance.config);
        DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', cacheKey);
        
        // Refresh dropdown
        this.refresh(fieldId);
    },
    
    /**
     * Generate cache key based on configuration
     * 
     * @param {object} config - Extension selector configuration
     * @returns {object} Cache key parameters
     */
    generateCacheKey(config) {
        const cacheParams = {};
        
        if (config.type && config.type !== 'all') {
            cacheParams.type = config.type;
        }
        
        if (config.excludeExtensions && config.excludeExtensions.length > 0) {
            cacheParams.exclude = config.excludeExtensions.join(',');
        }
        
        return cacheParams;
    },
    
    /**
     * Destroy instance
     * 
     * @param {string} fieldId - Field ID
     */
    destroy(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance) {
            // Remove from instances
            this.instances.delete(fieldId);
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
    module.exports = ExtensionSelector;
}