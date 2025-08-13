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
     * Initialize network filter dropdown with simplified logic
     * 
     * @param {jQuery|string} selector - Dropdown selector or jQuery element
     * @param {Object} options - Configuration options
     * @param {string} options.currentValue - Current selected value
     * @param {string} options.providerType - Provider type ('SIP' or 'IAX')
     * @param {Function} options.onChange - On change callback
     * @returns {jQuery} Initialized dropdown element
     */
    initializeDropdown(selector, options = {}) {
        const $select = typeof selector === 'string' ? $(selector) : selector;
        if (!$select || $select.length === 0) return $select;
        
        const currentValue = options.currentValue || 'none';
        const categories = options.providerType === 'IAX' ? ['IAX'] : ['SIP'];
        
        // Initialize Semantic UI dropdown first
        $select.dropdown({
            forceSelection: false,
            onChange: (value) => {
                if (options.onChange) options.onChange(value);
            }
        });
        
        // Get the wrapper element created by Fomantic UI
        const $dropdown = $select.parent('.ui.dropdown');
        
        // Show loading state on wrapper
        $dropdown.addClass('loading');
        
        // Load data and populate dropdown
        this.getAllowedForProviders((data) => {
            // Remove loading state from wrapper
            $dropdown.removeClass('loading');
            
            if (data && Array.isArray(data)) {
                // Clear and populate options
                $select.empty();
                data.forEach(filter => {
                    $select.append(`<option value="${filter.value}">${filter.text || filter.name}</option>`);
                });
                
                // Set current value and refresh dropdown
                $select.val(currentValue);
                $dropdown.dropdown('refresh');
                
                // Set selected value if it exists in options
                if (currentValue && $select.find(`option[value="${currentValue}"]`).length > 0) {
                    $dropdown.dropdown('set selected', currentValue);
                }
            } else {
                // Fallback to default "none" option
                const noneText = globalTranslate.ex_NoNetworkFilter || 'None';
                $select.empty().append(`<option value="none">${noneText}</option>`);
                $select.val('none');
                $dropdown.dropdown('refresh');
                $dropdown.dropdown('set selected', 'none');
            }
        }, categories);
        
        return $dropdown;
    },
    
};

// Export as part of window object for use in other modules
window.NetworkFiltersAPI = NetworkFiltersAPI;