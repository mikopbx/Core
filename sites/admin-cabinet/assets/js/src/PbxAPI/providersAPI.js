/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * ProvidersAPI - REST API client for providers management
 * 
 * Provides methods for retrieving provider information with support for:
 * - Getting categorized list of providers (SIP/IAX2)
 * - Provider status information
 * - Filtering enabled/disabled providers
 */
const ProvidersAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/providers/getList',
        getStatuses: '/pbxcore/api/providers/getStatuses'
    },
    
    /**
     * Get list of all providers organized by type
     * 
     * @param {boolean} includeDisabled - Include disabled providers in the list
     * @param {function} callback - Callback function
     */
    getList: function(includeDisabled, callback) {
        // Default to false if not specified
        if (typeof includeDisabled === 'function') {
            callback = includeDisabled;
            includeDisabled = false;
        }
        
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            data: {
                includeDisabled: includeDisabled ? 'true' : 'false'
            },
            on: 'now',
            onSuccess: function(response) {
                if (response.result && response.data) {
                    callback(response);
                } else {
                    callback({
                        result: false,
                        data: []
                    });
                }
            },
            onFailure: function(response) {
                callback({
                    result: false,
                    data: [],
                    messages: response.messages || {}
                });
            },
            onError: function() {
                callback({
                    result: false,
                    data: [],
                    messages: {error: ['Network error']}
                });
            }
        });
    },
    
    /**
     * Get list of providers formatted for dropdown
     * 
     * @param {function} callback - Callback function
     */
    getForDropdown: function(callback) {
        this.getList(false, function(response) {
            if (response.result && response.data) {
                const formattedData = ProvidersAPI.formatForDropdown(response.data);
                callback({
                    result: true,
                    data: formattedData
                });
            } else {
                callback(response);
            }
        });
    },
    
    /**
     * Format providers data for dropdown without categories
     * 
     * @param {array} providers - Array of provider objects
     * @param {boolean} includeNone - Whether to include 'none' option (default: true)
     * @return {array} Formatted data for dropdown
     */
    formatForDropdown: function(providers, includeNone = true) {
        const results = [];
        
        // Add 'none' option with proper translation (only if requested)
        if (includeNone) {
            results.push({
                name: globalTranslate.ir_AnyProvider_v2 || 'Any provider',
                value: 'none'
            });
        }
        
        // Sort providers by name
        const sortedProviders = providers.slice().sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
        
        // Add all providers to results
        sortedProviders.forEach(function(provider) {
            // Provider name already contains icon from REST API
            let displayName = provider.name;
            
            // Add visual indicators for disabled providers (but still allow selection)
            if (provider.disabled) {
                displayName += ' <span class="ui mini basic label">' + (globalTranslate.mo_Disabled || 'Disabled') + '</span>';
            }
            
            const item = {
                name: displayName,
                value: provider.uniqid
            };
            
            results.push(item);
        });
        
        return results;
    },
    
    /**
     * Get provider statuses
     * 
     * @param {function} callback - Callback function
     */
    getStatuses: function(callback) {
        $.api({
            url: this.endpoints.getStatuses,
            method: 'GET',
            on: 'now',
            onSuccess: function(response) {
                callback(response);
            },
            onFailure: function(response) {
                callback(response);
            },
            onError: function() {
                callback({
                    result: false,
                    messages: {error: ['Network error']}
                });
            }
        });
    },
    
    /**
     * Get dropdown settings for providers
     * This uses Semantic UI's API settings to load data on-demand
     * 
     * @param {function|object} cbOnChange - Callback for dropdown change event OR options object
     * @param {object} options - Options object (can be first parameter if cbOnChange is object)
     * @param {boolean} options.includeNone - Whether to include 'none' option (default: true)
     * @param {boolean} options.forceSelection - Force user to select a value (default: false)
     * @return {object} Dropdown settings object
     */
    getDropdownSettings: function(cbOnChange, options) {
        // Handle different parameter combinations
        let callback = cbOnChange;
        let settings = options || {};
        
        // If first parameter is an object, treat it as options
        if (typeof cbOnChange === 'object' && cbOnChange !== null) {
            settings = cbOnChange;
            callback = settings.onChange;
        }
        
        // Default values
        const includeNone = settings.includeNone !== undefined ? settings.includeNone : true;
        const forceSelection = settings.forceSelection !== undefined ? settings.forceSelection : false;
        
        return {
            apiSettings: {
                url: Config.pbxUrl + ProvidersAPI.endpoints.getList,
                method: 'GET',
                data: {
                    includeDisabled: 'true'
                },
                cache: false,
                beforeSend: function(settings) {
                    settings.data = $.extend({}, settings.urlData, settings.data);
                    return settings;
                },
                onResponse: function(response) {
                    const formattedResponse = {
                        success: false,
                        results: []
                    };
                    
                    if (response && response.result && response.data) {
                        formattedResponse.success = true;
                        formattedResponse.results = ProvidersAPI.formatForDropdown(response.data, includeNone);
                    }
                    
                    return formattedResponse;
                }
            },
            onChange: function(value) {
                // Update hidden input based on field name
                $('input[name="provider"], input[name="providerid"]').val(value).trigger('change');
                // Call custom callback if provided
                if (callback) {
                    callback(value);
                }
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: false,
            forceSelection: forceSelection,
            allowAdditions: false,
            hideDividers: 'empty',
            preserveHTML: true,
            templates: {
                menu: ProvidersAPI.customDropdownMenu
            }
        };
    },
    
    /**
     * Creates custom dropdown menu without categories
     * 
     * @param {object} response - API response
     * @param {object} fields - Field configuration
     * @return {string} HTML for dropdown menu
     */
    customDropdownMenu: function(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        
        $.each(values, function(index, option) {
            // Add regular item
            html += '<div class="item" data-value="' + option[fields.value] + '">';
            html += option[fields.name];
            html += '</div>';
        });
        
        return html;
    }
};