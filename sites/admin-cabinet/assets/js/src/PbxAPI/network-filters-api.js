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
 * Provides methods to fetch network filter data for dropdowns.
 * 
 * API response format:
 * {
 *   result: true,
 *   data: [
 *     { value: 'none', represent: '<i class="globe icon"></i> Allow from any address' },
 *     { value: '123', represent: '<i class="filter icon"></i> Office Network (192.168.1.0/24)' }
 *   ]
 * }
 * 
 * @module NetworkFiltersAPI
 */
const NetworkFiltersAPI = {
    
    /**
     * Get all network filters for dropdown select
     * Returns filters with 'value' and 'represent' fields
     * 
     * @param {Function} callback - Callback function that receives data array or false on error
     */
    getNetworksForSelect(callback) {
        const url = `/pbxcore/api/v3/network-filters:getForSelect`;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            data: {
                categories: ['SIP', 'IAX', 'AMI', 'API']
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
     * Get network filters for dropdown select filtered by categories
     * Returns filters with 'value' and 'represent' fields
     * 
     * @param {Function} callback - Callback function that receives data array or false on error
     * @param {Array|string} categories - Filter categories: 'SIP', 'IAX', 'AMI', 'API' (default: ['SIP'])
     */
    getForSelect(callback, categories = ['SIP'], includeLocalhost = false) {
        const url = `/pbxcore/api/v3/network-filters:getForSelect`;
        
        const params = {
            categories: categories
        };
        
        // Add includeLocalhost flag for AMI/API categories
        if (includeLocalhost && (categories.includes('AMI') || categories.includes('API'))) {
            params.includeLocalhost = true;
        }
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            data: params,
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
     * Initialize network filter dropdown
     * @deprecated Use NetworkFilterSelector module instead for better functionality
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
        this.getForSelect((data) => {
            // Remove loading state from wrapper
            $dropdown.removeClass('loading');
            
            if (data && Array.isArray(data)) {
                // Clear and populate options
                $select.empty();
                data.forEach(filter => {
                    // Use 'represent' field from new API structure
                    $select.append(`<option value="${filter.value}">${filter.represent}</option>`);
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
                const noneText = globalTranslate.ex_NoNetworkFilter;
                $select.empty().append(`<option value="none"><i class="globe icon"></i> ${noneText}</option>`);
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