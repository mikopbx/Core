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

/* global $, globalTranslate, NetworkFiltersAPI, Form */

/**
 * NetworkFilterSelector - Universal component for network filter dropdown selection
 * 
 * Provides consistent network filter selection functionality across the application.
 * Works with simplified API that returns only 'value' and 'represent' fields.
 * 
 * Features:
 * - Automatic loading of network filters from REST API
 * - Support for various filter types (SIP, IAX, AMI, API)
 * - HTML rendering support (icons included in 'represent' field)
 * - Automatic form change tracking
 * - Loading state management
 * 
 * Quick Start Guide:
 * ==================
 * 
 * 1. Basic initialization:
 *    NetworkFilterSelector.init('#network-filter-dropdown', {
 *        filterType: 'SIP',
 *        currentValue: 'none'
 *    });
 * 
 * 2. With change handler:
 *    NetworkFilterSelector.init('#dropdown', {
 *        filterType: 'SIP',
 *        onChange: (value, text) => {
 *            console.log('Selected:', value);
 *        }
 *    });
 * 
 * 3. For provider forms (SIP/IAX):
 *    NetworkFilterSelector.init('#networkfilterid', {
 *        filterType: providerType === 'IAX' ? 'IAX' : 'SIP',
 *        currentValue: $('#networkfilterid').val()
 *    });
 * 
 * API Response Format:
 * ====================
 * {
 *   result: true,
 *   data: [
 *     { value: 'none', represent: '<i class="globe icon"></i> Allow from any address' },
 *     { value: '123', represent: '<i class="filter icon"></i> Office Network' }
 *   ]
 * }
 * 
 * Configuration Options:
 * ======================
 * @param {string} filterType - Type of filter: 'SIP', 'IAX', 'AMI', 'API' (default: 'SIP')
 * @param {string} currentValue - Current selected value (default: 'none')
 * @param {string} currentText - Current selected text for display
 * @param {boolean} includeNone - Include "None" option (default: true)
 * @param {Function} onChange - Callback on value change: (value, text, $item) => {}
 * @param {string} hiddenFieldId - ID of hidden field to sync (default: 'networkfilterid')
 * 
 * @module NetworkFilterSelector
 */
const NetworkFilterSelector = {
    
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
        filterType: 'SIP',        // Default filter type
        includeNone: true,        // Include "None" option
        forceSelection: false,    // Force user to select a filter
        clearable: false,         // Don't allow clearing selection
        fullTextSearch: true,     // Enable full text search
        allowAdditions: false,    // Don't allow custom values
        onChange: null,           // Change callback function
        hiddenFieldId: 'networkfilterid', // ID of hidden field to update
        noneText: null,           // Text for "None" option (auto-detected)
        noneValue: 'none',        // Value for "None" option
        placeholder: null,        // Placeholder text (auto-detected)
        currentValue: null,       // Current selected value
        currentText: null,        // Current selected text
    },
    
    /**
     * Initialize network filter selector
     * 
     * @param {string|jQuery} selector - Dropdown selector or jQuery object
     * @param {object} options - Configuration options
     * @param {string} options.filterType - Type of filter ('SIP', 'IAX', 'AMI', 'API')
     * @param {string} options.currentValue - Current filter ID value
     * @param {string} options.currentText - Current filter display text
     * @param {boolean} options.includeNone - Include "None" option
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
            const existingInstance = this.instances.get(instanceId);
            // Update config if new options provided
            if (options.currentValue !== undefined) {
                existingInstance.currentValue = options.currentValue;
            }
            if (options.currentText !== undefined) {
                existingInstance.currentText = options.currentText;
            }
            // If dropdown was destroyed, reinitialize it
            if (!$dropdown.hasClass('ui') || !$dropdown.hasClass('dropdown')) {
                this.initializeDropdown(existingInstance);
            }
            return existingInstance;
        }
        
        // Merge options with defaults
        const config = { ...this.defaults, ...options };
        
        // Auto-detect texts based on context
        if (!config.noneText) {
            config.noneText = this.detectNoneText(config.filterType);
        }
        if (!config.placeholder) {
            config.placeholder = this.detectPlaceholder($dropdown, config.filterType);
        }
        
        // Create instance
        const instance = {
            id: instanceId,
            $dropdown,
            config,
            $hiddenField: $(`#${config.hiddenFieldId}`),
            initialized: false,
            currentValue: config.currentValue || config.noneValue,
            currentText: config.currentText || null
        };
        
        // Initialize dropdown
        this.initializeDropdown(instance);
        
        // Store instance
        this.instances.set(instanceId, instance);
        
        return instance;
    },
    
    /**
     * Detect appropriate "None" text based on filter type
     * 
     * @param {string} filterType - Type of filter
     * @returns {string} Detected text
     */
    detectNoneText(filterType) {
        // Use unified translation for all filter types
        // The server already provides correct translation via API
        return globalTranslate.ex_NoNetworkFilter || 'None';
    },
    
    /**
     * Detect appropriate placeholder text
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @param {string} filterType - Type of filter
     * @returns {string} Detected text
     */
    detectPlaceholder($dropdown, filterType) {
        // Check existing default text
        const $defaultText = $dropdown.find('.default.text');
        if ($defaultText.length > 0) {
            return $defaultText.text();
        }
        return this.detectNoneText(filterType);
    },
    
    /**
     * Initialize dropdown with network filter data
     * 
     * @param {object} instance - Selector instance
     */
    initializeDropdown(instance) {
        const { $dropdown, config, $hiddenField, currentValue, currentText } = instance;
        
        // Check if dropdown is already initialized with Semantic UI
        const isInitialized = $dropdown.hasClass('ui') && $dropdown.hasClass('dropdown') && 
                             $dropdown.data('moduleDropdown') !== undefined;
        
        if (isInitialized) {
            // Just refresh the dropdown if already initialized
            $dropdown.dropdown('refresh');
            // Update value if needed
            if (currentValue) {
                $dropdown.dropdown('set selected', currentValue, null, true);
            }
            return;
        }
        
        // Get dropdown settings from NetworkFiltersAPI
        const apiSettings = this.getDropdownSettings(instance);
        
        // Prepare dropdown settings
        const dropdownSettings = {
            ...apiSettings,
            forceSelection: config.forceSelection,
            clearable: config.clearable,
            fullTextSearch: config.fullTextSearch,
            allowAdditions: config.allowAdditions,
            placeholder: config.placeholder,
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
        };
        
        // Clear any existing initialization only if needed
        if ($dropdown.data('moduleDropdown')) {
            $dropdown.dropdown('destroy');
        }
        
        // Initialize dropdown
        $dropdown.dropdown({
            ...dropdownSettings,
            apiSettings: {
                ...dropdownSettings.apiSettings,
                cache: false,  // No caching - always get fresh data
                throttle: 0    // Load immediately on interaction
            }
        });
        
        // Pre-load data for immediate display
        this.preloadData(instance);
        
        instance.initialized = true;
    },
    
    /**
     * Preload data for dropdown
     * 
     * @param {object} instance - Selector instance
     */
    preloadData(instance) {
        const { $dropdown, config, currentValue, currentText } = instance;
        const filterCategories = [config.filterType];
        
        // Show loading state
        $dropdown.addClass('loading');
        
        // If we have current value and text, add it temporarily while loading
        if (currentValue && currentText) {
            const $menu = $dropdown.find('.menu');
            if ($menu.length === 0) {
                $dropdown.append('<div class="menu"></div>');
            }
            // Add current option temporarily
            $menu.html(`<div class="item" data-value="${currentValue}">${currentText}</div>`);
            $dropdown.dropdown('refresh');
            $dropdown.dropdown('set selected', currentValue, null, true);
        }
        
        // Use unified API method for all filter types
        const apiMethod = NetworkFiltersAPI.getForSelect;
        
        // Load data from API
        apiMethod.call(NetworkFiltersAPI, (data) => {
            // Remove loading state
            $dropdown.removeClass('loading');
            
            if (data && Array.isArray(data)) {
                // Clear and populate options
                const $menu = $dropdown.find('.menu');
                $menu.empty();
                
                // Add filter options from API (API already includes "none" option when needed)
                data.forEach(filter => {
                    const value = filter.value;
                    const text = filter.represent; // New API structure uses 'represent' field
                    
                    // Add item with HTML from represent field
                    $menu.append(
                        `<div class="item" data-value="${value}">${text}</div>`
                    );
                });
                
                // Refresh dropdown
                $dropdown.dropdown('refresh');
                
                // Set selected value if exists
                if (currentValue) {
                    // Find the item with current value
                    const $item = $dropdown.find(`.item[data-value="${currentValue}"]`);
                    if ($item.length > 0) {
                        // Set selected without triggering onChange
                        $dropdown.dropdown('set selected', currentValue, null, true);
                    } else if (currentValue && currentText) {
                        // If value not found in loaded data but we have text, add it
                        $menu.append(`<div class="item" data-value="${currentValue}">${currentText}</div>`);
                        $dropdown.dropdown('refresh');
                        $dropdown.dropdown('set selected', currentValue, null, true);
                    } else if (config.includeNone) {
                        // If value not found, fall back to none
                        $dropdown.dropdown('set selected', config.noneValue, null, true);
                    }
                }
            } else {
                // Fallback - keep current value if we have it
                const $menu = $dropdown.find('.menu');
                if (currentValue && currentText) {
                    $menu.html(`<div class="item" data-value="${currentValue}">${currentText}</div>`);
                } else if (config.includeNone) {
                    $menu.empty().append(
                        `<div class="item" data-value="${config.noneValue}">${config.noneText}</div>`
                    );
                }
                $dropdown.dropdown('refresh');
                $dropdown.dropdown('set selected', currentValue || config.noneValue, null, true);
            }
        }, filterCategories);
    },
    
    /**
     * Get dropdown settings for API integration
     * 
     * @param {object} instance - Selector instance
     * @returns {object} Dropdown API settings
     */
    getDropdownSettings(instance) {
        const { config } = instance;
        const filterCategories = [config.filterType];
        
        // Use unified API endpoint for all filter types
        const apiUrl = '/pbxcore/api/v2/network-filters/getForSelect';
        const apiMethod = 'GET';
        
        return {
            apiSettings: {
                url: apiUrl,
                method: apiMethod,
                cache: false,
                data: { categories: filterCategories },
                beforeSend: function(settings) {
                    return settings;
                },
                onResponse: (response) => {
                    if (!response || !response.result || !response.data) {
                        return {
                            success: false,
                            results: []
                        };
                    }
                    
                    const results = [];
                    
                    // API already includes properly formatted options with icons
                    // Simply map the response data to dropdown format
                    if (Array.isArray(response.data)) {
                        response.data.forEach(filter => {
                            results.push({
                                value: filter.value,
                                name: filter.represent,
                                text: filter.represent
                            });
                        });
                    }
                    
                    return {
                        success: true,
                        results: results
                    };
                }
            }
        };
    },
    
    /**
     * Refresh network filter list for a selector
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
     * @param {string} value - Network filter ID to select
     * @param {string} text - Optional display text
     */
    setValue(instanceId, value, text = null) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return;
        }
        
        // Update instance values
        instance.currentValue = value;
        if (text) {
            instance.currentText = text;
        }
        
        // Check if dropdown has this value in menu
        const $item = instance.$dropdown.find(`.menu .item[data-value="${value}"]`);
        
        if ($item.length === 0 && text) {
            // If item doesn't exist and we have text, add it
            const $menu = instance.$dropdown.find('.menu');
            $menu.append(`<div class="item" data-value="${value}">${text}</div>`);
            instance.$dropdown.dropdown('refresh');
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
     * @returns {string|null} Selected network filter ID
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
     * Initialize all network filter selectors on the page
     * 
     * @param {string} containerSelector - Container to search within
     */
    initializeAll(containerSelector = 'body') {
        const $container = $(containerSelector);
        
        // Find all network filter dropdowns
        $container.find('.network-filter-select').each((index, element) => {
            const $dropdown = $(element);
            
            // Skip if already initialized
            if ($dropdown.data('network-filter-selector-initialized')) {
                return;
            }
            
            // Detect filter type from context
            let filterType = 'SIP'; // Default
            const formId = $dropdown.closest('form').attr('id');
            
            if (formId) {
                if (formId.includes('extension')) {
                    filterType = 'SIP';
                } else if (formId.includes('provider')) {
                    // Provider type needs to be determined from provider type field
                    filterType = 'SIP'; // Will be overridden in provider-specific code
                } else if (formId.includes('manager')) {
                    filterType = 'AMI';
                } else if (formId.includes('api-key')) {
                    filterType = 'API';
                }
            }
            
            // Initialize with detected settings
            // Hidden field ID is always 'networkfilterid'
            this.init($dropdown, {
                filterType: filterType,
                hiddenFieldId: 'networkfilterid'
            });
            
            // Mark as initialized
            $dropdown.data('network-filter-selector-initialized', true);
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkFilterSelector;
}