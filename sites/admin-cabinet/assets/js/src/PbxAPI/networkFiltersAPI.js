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

/* global globalRootUrl, PbxApi */

/**
 * NetworkFiltersAPI module for working with network filters.
 * 
 * @module NetworkFiltersAPI
 */
const NetworkFiltersAPI = {
    
    /**
     * Get all network filters for dropdown select (simplified)
     * 
     * @param {Function} callback - Callback function
     */
    getNetworksForSelect(callback) {
        const url = `${globalRootUrl}pbxcore/api/v2/network-filters/getNetworksForSelect`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(false);
            },
            onError() {
                callback(false);
            }
        });
    },
    
    /**
     * Get network filters for dropdown select
     * 
     * @param {Function} callback - Callback function
     * @param {Array|string} categories - Filter categories (default: ['SIP'])
     */
    getForSelect(callback, categories = ['SIP']) {
        const url = `${globalRootUrl}pbxcore/api/v2/network-filters/getForSelect`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            data: {
                categories: categories
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(false);
            },
            onError() {
                callback(false);
            }
        });
    },
    
    /**
     * Get network filters allowed for providers
     * 
     * @param {Function} callback - Callback function
     * @param {Array|string} categories - Filter categories (default: ['SIP'])
     */
    getAllowedForProviders(callback, categories = ['SIP']) {
        const url = `/pbxcore/api/v2/network-filters/getAllowedForProviders`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'POST',
            data: {
                categories: Array.isArray(categories) ? categories : [categories]
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(false);
            },
            onError() {
                callback(false);
            }
        });
    },
    
    /**
     * Get dropdown settings for Semantic UI dropdown (simplified)
     * 
     * @param {Function} onChange - On change callback
     * @returns {Object} Dropdown settings
     */
    getDropdownSettings(onChange = null) {
        return {
            apiSettings: {
                url: `${globalRootUrl}pbxcore/api/v2/network-filters/getNetworksForSelect`,
                cache: true,
                throttle: 400,
                successTest(response) {
                    return response && response.result === true;
                },
                onResponse(response) {
                    if (!response || !response.data) {
                        return {
                            success: false,
                            results: []
                        };
                    }
                    
                    const results = response.data.map(filter => ({
                        value: filter.value,
                        name: filter.name,
                        text: filter.text
                    }));
                    
                    return {
                        success: true,
                        results: results
                    };
                }
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: false,
            saveRemoteData: true,
            forceSelection: false,
            direction: 'downward',
            hideDividers: 'empty',
            onChange: onChange
        };
    },
    
    /**
     * Initialize network filter dropdown
     * 
     * @param {jQuery|string} selector - Dropdown selector or jQuery element
     * @param {Object} options - Configuration options
     * @param {string} options.currentValue - Current selected value
     * @param {Array|string} options.categories - Filter categories (default: ['SIP'])
     * @param {string} options.providerType - Provider type ('SIP' or 'IAX')
     * @param {Function} options.onChange - On change callback
     * @returns {jQuery} Initialized dropdown element
     */
    initializeDropdown(selector, options = {}) {
        const $element = typeof selector === 'string' ? $(selector) : selector;
        if (!$element || $element.length === 0) return $element;
        
        // Default options
        const settings = {
            currentValue: options.currentValue || 'none',
            categories: options.categories || (options.providerType === 'IAX' ? ['IAX'] : ['SIP']),
            onChange: options.onChange || null
        };
        
        // If it's a select element, work with it directly
        let $dropdown = $element;
        
        // Show loading state
        $dropdown.addClass('loading');
        
        // Initialize dropdown with basic settings
        const dropdownSettings = {
            forceSelection: false,
            direction: 'downward',
            onChange: (value) => {
                // Make sure the select element value is updated
                if ($dropdown.is('select')) {
                    $dropdown.val(value);
                }
                
                // Call custom onChange if provided
                if (typeof settings.onChange === 'function') {
                    settings.onChange(value);
                }
            }
        };
        
        // Initialize dropdown - this will convert select to Semantic UI dropdown
        $dropdown.dropdown(dropdownSettings);
        
        // Load and populate data
        this.getAllowedForProviders((data) => {
            $dropdown.removeClass('loading');
            
            if (!data) {
                console.warn('Failed to load network filters');
                // Set default "none" option if API fails
                this.setDefaultOption($dropdown, settings.currentValue);
                return;
            }
            
            // Populate dropdown
            this.populateDropdown($dropdown, data, settings.currentValue);
            
        }, settings.categories);
        
        return $dropdown;
    },
    
    /**
     * Populate dropdown with data
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @param {Array} data - Options data
     * @param {string} currentValue - Value to select
     */
    populateDropdown($dropdown, data, currentValue) {
        if (!$dropdown || $dropdown.length === 0 || !Array.isArray(data)) return;
        
        // Always work with the original select element
        const $select = $dropdown.is('select') ? $dropdown : $dropdown.find('select');
        
        if ($select.length > 0) {
            // Clear existing options
            $select.empty();
            
            // Add options from API data
            data.forEach(filter => {
                $select.append(`<option value="${filter.value}">${filter.text || filter.name}</option>`);
            });
            
            // Set current value on the select element
            if (currentValue && $select.find(`option[value="${currentValue}"]`).length > 0) {
                $select.val(currentValue);
            }
            
            // If this is a Semantic UI dropdown, refresh it to show the new options
            if ($dropdown.hasClass('ui') && $dropdown.hasClass('dropdown')) {
                $dropdown.dropdown('refresh');
                if (currentValue) {
                    $dropdown.dropdown('set selected', currentValue);
                }
            }
        } else {
            // Fallback for pure Semantic UI dropdowns without select element
            const $menu = $dropdown.find('.menu');
            $menu.empty();
            
            data.forEach(filter => {
                $menu.append(`<div class="item" data-value="${filter.value}">${filter.text || filter.name}</div>`);
            });
            
            // Refresh dropdown
            $dropdown.dropdown('refresh');
            
            // Set current value
            if (currentValue) {
                $dropdown.dropdown('set selected', currentValue);
            }
        }
    },
    
    /**
     * Set default "none" option when API fails
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @param {string} currentValue - Current value
     */
    setDefaultOption($dropdown, currentValue) {
        const noneText = globalTranslate.ex_NoNetworkFilter || 'None';
        const valueToSet = currentValue || 'none';
        
        // Always work with the original select element
        const $select = $dropdown.is('select') ? $dropdown : $dropdown.find('select');
        
        if ($select.length > 0) {
            // Add default option to select element
            $select.empty().append(`<option value="none">${noneText}</option>`);
            $select.val(valueToSet);
            
            // If this is a Semantic UI dropdown, refresh it
            if ($dropdown.hasClass('ui') && $dropdown.hasClass('dropdown')) {
                $dropdown.dropdown('refresh');
                $dropdown.dropdown('set selected', valueToSet);
            }
        } else {
            // Fallback for pure Semantic UI dropdowns
            const $menu = $dropdown.find('.menu');
            $menu.empty().append(`<div class="item" data-value="none">${noneText}</div>`);
            $dropdown.dropdown('refresh');
            $dropdown.dropdown('set selected', valueToSet);
        }
    }
};

// Export as part of window object for use in other modules
window.NetworkFiltersAPI = NetworkFiltersAPI;