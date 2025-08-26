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

/* global $, globalTranslate, ProvidersAPI, Form */

/**
 * ProviderSelector - Universal component for provider dropdown selection
 * 
 * Provides consistent provider selection functionality across the application:
 * - Unified initialization and configuration
 * - REST API integration for loading providers
 * - Standard field naming (providerid)
 * - Support for various dropdown behaviors
 * 
 * Usage:
 * ProviderSelector.init('#provider-dropdown', {
 *     includeNone: true,           // Show "None" option
 *     forceSelection: false,        // Require selection
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module ProviderSelector
 */
const ProviderSelector = {
    
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
        includeNone: true,        // Include "None/Any" option
        forceSelection: false,    // Force user to select a provider
        clearable: false,         // Don't allow clearing selection
        fullTextSearch: true,     // Enable full text search
        allowAdditions: false,    // Don't allow custom values
        onChange: null,           // Change callback function
        hiddenFieldId: 'providerid', // ID of hidden field to update
        noneText: null,           // Text for "None" option (auto-detected)
        placeholder: null,        // Placeholder text (auto-detected)
    },
    
    /**
     * Initialize provider selector
     * 
     * @param {string|jQuery} selector - Dropdown selector or jQuery object
     * @param {object} options - Configuration options
     * @param {string} options.currentValue - Current provider ID value
     * @param {string} options.currentText - Current provider display text
     * @returns {object|null} Selector instance
     */
    init(selector, options = {}) {
        const $dropdown = $(selector);
        if ($dropdown.length === 0) {
            return null;
        }
        
        // Generate unique ID for instance
        const instanceId = $dropdown.attr('id') || Math.random().toString(36).substr(2, 9);
        
        // Check if already initialized
        if (this.instances.has(instanceId)) {
            return this.instances.get(instanceId);
        }
        
        // Merge options with defaults
        const config = { ...this.defaults, ...options };
        
        // Auto-detect texts based on context
        if (!config.noneText) {
            config.noneText = this.detectNoneText($dropdown);
        }
        if (!config.placeholder) {
            config.placeholder = this.detectPlaceholder($dropdown);
        }
        
        // Create instance
        const instance = {
            id: instanceId,
            $dropdown,
            config,
            $hiddenField: $(`#${config.hiddenFieldId}`),
            initialized: false,
            currentValue: config.currentValue || null,
            currentText: config.currentText || null
        };
        
        // Initialize dropdown
        this.initializeDropdown(instance);
        
        // Store instance
        this.instances.set(instanceId, instance);
        
        return instance;
    },
    
    /**
     * Detect appropriate "None" text based on context
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @returns {string} Detected text
     */
    detectNoneText($dropdown) {
        // Check for incoming routes context
        if ($dropdown.closest('#incoming-route-form').length > 0) {
            return globalTranslate.ir_AnyProvider_v2 || 'Any provider';
        }
        // Default for outbound routes
        return globalTranslate.or_SelectProvider || 'Select provider';
    },
    
    /**
     * Detect appropriate placeholder text
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @returns {string} Detected text
     */
    detectPlaceholder($dropdown) {
        // Check existing default text
        const $defaultText = $dropdown.find('.default.text');
        if ($defaultText.length > 0) {
            return $defaultText.text();
        }
        return this.detectNoneText($dropdown);
    },
    
    /**
     * Initialize dropdown with provider data
     * 
     * @param {object} instance - Selector instance
     */
    initializeDropdown(instance) {
        const { $dropdown, config, $hiddenField, currentValue, currentText } = instance;
        
        // Get dropdown settings from ProvidersAPI
        const apiSettings = ProvidersAPI.getDropdownSettings({
            includeNone: config.includeNone,
            forceSelection: config.forceSelection,
            onChange: (value, text, $selectedItem) => {
                // Update hidden field
                if ($hiddenField.length > 0) {
                    $hiddenField.val(value).trigger('change');
                }
                
                // Call custom onChange if provided
                if (typeof config.onChange === 'function') {
                    config.onChange(value, text, $selectedItem);
                }
                
                // Mark form as changed if Form object exists
                if (typeof Form !== 'undefined' && Form.dataChanged) {
                    Form.dataChanged();
                }
            }
        });
        
        // Apply additional settings
        const dropdownSettings = {
            ...apiSettings,
            clearable: config.clearable,
            fullTextSearch: config.fullTextSearch,
            allowAdditions: config.allowAdditions,
            placeholder: config.placeholder,
        };
        
        // Clear any existing initialization
        $dropdown.dropdown('destroy');
        
        // If we have initial value and text, pre-populate the dropdown
        if (currentValue && currentText) {
            // Set the hidden field value
            if ($hiddenField.length > 0) {
                $hiddenField.val(currentValue);
            }
            
            // Create initial option in the dropdown
            const $menu = $dropdown.find('.menu');
            if ($menu.length === 0) {
                $dropdown.append('<div class="menu"></div>');
            }
            
            // Add the current provider as an option
            $dropdown.find('.menu').html(
                `<div class="item" data-value="${currentValue}">${currentText}</div>`
            );
            
            // Set the display text
            const $defaultText = $dropdown.find('.default.text');
            if ($defaultText.length > 0) {
                $defaultText.removeClass('default').html(currentText);
            } else {
                $dropdown.prepend(`<div class="text">${currentText}</div>`);
            }
        }
        
        // Initialize dropdown with lazy loading - data will be loaded on first interaction
        $dropdown.dropdown({
            ...dropdownSettings,
            apiSettings: {
                ...dropdownSettings.apiSettings,
                cache: false,  // No caching - always get fresh data
                throttle: 0    // Load immediately on interaction
            }
        });
        
        // If we have a value, mark it as selected
        if (currentValue) {
            $dropdown.dropdown('set selected', currentValue, null, true);  // Last param = preventChangeTrigger
        }
        
        instance.initialized = true;
    },
    
    /**
     * Refresh provider list for a selector
     * 
     * @param {string} instanceId - Instance ID
     */
    refresh(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return;
        }
        
        // Clear cache and reinitialize
        instance.$dropdown.dropdown('clear');
        this.initializeDropdown(instance);
    },
    
    /**
     * Set value for a selector
     * 
     * @param {string} instanceId - Instance ID
     * @param {string} value - Provider ID to select
     */
    setValue(instanceId, value) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return;
        }
        
        instance.$dropdown.dropdown('set selected', value);
        if (instance.$hiddenField.length > 0) {
            instance.$hiddenField.val(value).trigger('change');
        }
    },
    
    /**
     * Get value from a selector
     * 
     * @param {string} instanceId - Instance ID
     * @returns {string|null} Selected provider ID
     */
    getValue(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return null;
        }
        
        return instance.$dropdown.dropdown('get value') || null;
    },
    
    /**
     * Clear selection
     * 
     * @param {string} instanceId - Instance ID
     */
    clear(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return;
        }
        
        instance.$dropdown.dropdown('clear');
        if (instance.$hiddenField.length > 0) {
            instance.$hiddenField.val('').trigger('change');
        }
    },
    
    /**
     * Destroy selector instance
     * 
     * @param {string} instanceId - Instance ID
     */
    destroy(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return;
        }
        
        instance.$dropdown.dropdown('destroy');
        this.instances.delete(instanceId);
    },
    
    /**
     * Initialize all provider selectors on the page
     * 
     * @param {string} containerSelector - Container to search within
     */
    initializeAll(containerSelector = 'body') {
        const $container = $(containerSelector);
        
        // Find all provider dropdowns
        $container.find('#providerid-dropdown').each((index, element) => {
            const $dropdown = $(element);
            
            // Skip if already initialized
            if ($dropdown.data('provider-selector-initialized')) {
                return;
            }
            
            // Initialize with standard field ID
            this.init($dropdown, {
                hiddenFieldId: 'providerid'
            });
            
            // Mark as initialized
            $dropdown.data('provider-selector-initialized', true);
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderSelector;
}