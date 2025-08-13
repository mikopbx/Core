/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * ProvidersAPI - REST API v2 for providers management
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
const ProvidersAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/providers/getList',
        getRecord: '/pbxcore/api/v2/providers/getRecord',
        saveRecord: '/pbxcore/api/v2/providers/saveRecord',
        deleteRecord: '/pbxcore/api/v2/providers/deleteRecord',
        getStatuses: '/pbxcore/api/v2/providers/getStatuses',
        updateStatus: '/pbxcore/api/v2/providers/updateStatus'
    },
    
    /**
     * Get record by ID with security processing
     * 
     * @param {string} id - Record ID or empty string for new
     * @param {string} type - Provider type (SIP or IAX)
     * @param {function} callback - Callback function
     */
    getRecord: function(id, type, callback) {
        // Check if this is a new record or existing
        const isNewRecord = !id || id === '' || id === 'new';
        
        // Use RESTful URL with path parameters: /getRecord/SIP/SIP-TRUNK-123
        // Fall back to query parameters for 'new' records
        let url;
        if (isNewRecord) {
            // For new records, use query parameters
            url = this.endpoints.getRecord + (type ? '?type=' + type : '');
        } else {
            // For existing records, use RESTful path: /getRecord/SIP/SIP-TRUNK-123
            url = this.endpoints.getRecord + '/' + type + '/' + id;
        }
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize data for display
                    response.data = this.sanitizeProviderData(response.data);
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Get list of all providers with security processing
     * 
     * @param {function} callback - Callback function
     */
    getList: function(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            data: {
                includeDisabled: 'true'  // Always include disabled providers in admin panel
            },
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize array of providers
                    response.data = response.data.map(function(item) {
                        return this.sanitizeProviderData(item);
                    }.bind(this));
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, data: []});
            }
        });
    },
    
    /**
     * Save provider record with validation and security
     * 
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord: function(data, callback) {
        // Client-side validation
        if (!this.validateProviderData(data)) {
            callback({
                result: false, 
                messages: {error: ['Client-side validation failed']}
            });
            return;
        }
        
        // Form.js with convertCheckboxesToBool=true sends all checkboxes as boolean values
        // Server accepts boolean values directly, no conversion needed
        const processedData = {...data};
        
        const method = processedData.id ? 'PUT' : 'POST';
        const url = processedData.id ? 
            this.endpoints.saveRecord + '/' + processedData.id : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: processedData,
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    response.data = this.sanitizeProviderData(response.data);
                }
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Delete provider record
     * 
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord: function(id, callback) {
        $.api({
            url: this.endpoints.deleteRecord + '/' + id,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback(false);
            }
        });
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
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, data: {}});
            }
        });
    },
    
    /**
     * Get status for a specific provider by ID
     * 
     * @param {string} providerId - Provider unique ID
     * @param {string} providerType - Provider type (SIP or IAX)
     * @param {function} callback - Callback function
     */
    getStatusById: function(providerId, providerType, callback) {
        // Build URL with type if provided for better performance
        let url = '/pbxcore/api/v2/providers/getStatus/';
        if (providerType) {
            url += providerType.toUpperCase() + '/' + providerId;
        } else {
            url += providerId;
        }
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, data: null});
            }
        });
    },
    
    /**
     * Update provider status (enable/disable)
     * 
     * @param {object} data - Data with id, type, and disabled status
     * @param {function} callback - Callback function
     */
    updateStatus: function(data, callback) {
        // Validate required fields
        if (!data.id || !data.type) {
            callback({
                result: false, 
                messages: {error: ['Provider ID and type are required']}
            });
            return;
        }
        
        // Convert data to proper format
        const updateData = {
            id: data.id,
            type: data.type.toUpperCase(),
            disabled: !!data.disabled
        };
        
        $.api({
            url: this.endpoints.updateStatus,
            method: 'POST',
            data: updateData,
            on: 'now',
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false, messages: {error: ['Network error']}});
            }
        });
    },
    
    /**
     * Sanitize provider data for secure display
     * 
     * @param {object} data - Provider data from API
     * @return {object} Data ready for display
     */
    sanitizeProviderData: function(data) {
        if (!data) return data;
        
        const sanitized = {
            id: data.id,
            type: data.type || 'SIP',
            note: data.note || '',
            disabled: !!data.disabled
        };
        
        // SIP-specific fields
        if (data.type === 'SIP') {
            Object.assign(sanitized, {
                username: data.username || '',
                secret: data.secret || '',
                host: data.host || '',
                port: parseInt(data.port) || 5060,
                transport: data.transport || 'UDP',
                qualify: !!data.qualify,
                qualifyfreq: parseInt(data.qualifyfreq) || 60,
                registration_type: data.registration_type || 'outbound',
                extension: data.extension || '',
                description: data.description || '',
                networkfilterid: data.networkfilterid || '',
                manualattributes: data.manualattributes || '',
                dtmfmode: data.dtmfmode || 'auto',
                nat: data.nat || 'auto_force',
                fromuser: data.fromuser || '',
                fromdomain: data.fromdomain || '',
                outbound_proxy: data.outbound_proxy || '',
                disablefromuser: !!data.disablefromuser,
                noregister: !!data.noregister,
                receive_calls_without_auth: !!data.receive_calls_without_auth,
                additionalHosts: data.additionalHosts || [],
                // CallerID/DID fields
                cid_source: data.cid_source || 'default',
                cid_custom_header: data.cid_custom_header || '',
                cid_parser_start: data.cid_parser_start || '',
                cid_parser_end: data.cid_parser_end || '',
                cid_parser_regex: data.cid_parser_regex || '',
                did_source: data.did_source || 'default',
                did_custom_header: data.did_custom_header || '',
                did_parser_start: data.did_parser_start || '',
                did_parser_end: data.did_parser_end || '',
                did_parser_regex: data.did_parser_regex || '',
                cid_did_debug: !!data.cid_did_debug
            });
        }
        
        // IAX-specific fields
        if (data.type === 'IAX') {
            Object.assign(sanitized, {
                username: data.username || '',
                secret: data.secret || '',
                host: data.host || '',
                qualify: !!data.qualify,
                registration_type: data.registration_type || 'none',
                description: data.description || '',
                manualattributes: data.manualattributes || '',
                noregister: !!data.noregister,
                networkfilterid: data.networkfilterid || '',
                port: data.port || '',
                receive_calls_without_auth: !!data.receive_calls_without_auth
            });
        }
        
        return sanitized;
    },
    
    /**
     * Client-side validation
     * 
     * @param {object} data - Data to validate
     * @return {boolean} Validation result
     */
    validateProviderData: function(data) {
        // Check if this is a status-only update (contains only id, type, disabled)
        const isStatusUpdate = data.id && data.type && data.hasOwnProperty('disabled') && 
                              Object.keys(data).length === 3;
        
        if (isStatusUpdate) {
            // Minimal validation for status updates
            return data.type && ['SIP', 'IAX'].includes(data.type);
        }
        
        // Type validation
        if (!data.type || !['SIP', 'IAX'].includes(data.type)) {
            return false;
        }
        
        // Username validation (alphanumeric and basic symbols)
        if (data.username && !/^[a-zA-Z0-9._-]*$/.test(data.username)) {
            return false;
        }
        
        // Host validation (domain or IP)
        if (data.host) {
            const hostPattern = /^([a-zA-Z0-9.-]+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
            if (!hostPattern.test(data.host)) {
                return false;
            }
        }
        
        // Port validation
        if (data.port !== undefined && data.port !== null && data.port !== '') {
            const port = parseInt(data.port);
            if (isNaN(port) || port < 1 || port > 65535) {
                return false;
            }
        }
        
        // Transport validation for SIP
        if (data.type === 'SIP' && data.transport) {
            if (!['UDP', 'TCP', 'TLS'].includes(data.transport)) {
                return false;
            }
        }
        
        // Extension validation (numeric only)
        if (data.extension && !/^[0-9]*$/.test(data.extension)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Get dropdown settings for provider selection - BACKWARD COMPATIBILITY
     * This method maintains compatibility with existing forms that use the old API
     * 
     * @param {function|object} onChangeCallback - Callback when selection changes OR options object
     * @param {object} options - Additional options (when first param is callback)
     * @return {object} Semantic UI dropdown settings object
     */
    getDropdownSettings: function(onChangeCallback, options) {
        // Handle different parameter combinations
        let callback = onChangeCallback;
        let settings = options || {};
        
        // If first parameter is an object, treat it as options
        if (typeof onChangeCallback === 'object' && onChangeCallback !== null) {
            settings = onChangeCallback;
            callback = settings.onChange;
        }
        
        // Default values
        const includeNone = settings.includeNone !== undefined ? settings.includeNone : true;
        const forceSelection = settings.forceSelection !== undefined ? settings.forceSelection : false;
        return {
            apiSettings: {
                // Use the new REST API v2 endpoint
                url: this.endpoints.getList,
                method: 'GET',
                cache: false,
                data: {
                    includeDisabled: 'false'  // Only show enabled providers in dropdowns
                },
                onResponse: function(response) {
                    if (!response || !response.result || !response.data) {
                        return {
                            success: false,
                            results: []
                        };
                    }
                    
                    // Transform API response to dropdown format
                    const results = response.data.map(function(provider) {
                        // Use the 'name' field from server as-is, it already contains the icon
                        // Server sends: "<i class=\"server icon\"></i> IAX: Test IAX Provider"
                        
                        return {
                            value: provider.id,           // Use id as the value
                            name: provider.name,          // Use server's name field as-is
                            text: provider.name,          // Same for text display
                            // Store additional data for future use
                            providerType: provider.type,
                            providerId: provider.id,
                            host: provider.host || '',
                            username: provider.username || ''
                        };
                    });
                    
                    // Add 'None' option at the beginning only if includeNone is true
                    if (includeNone) {
                        results.unshift({
                            value: 'none',
                            name: globalTranslate.ir_AnyProvider_v2 || 'Any provider',
                            text: globalTranslate.ir_AnyProvider_v2 || 'Any provider'
                        });
                    }
                    
                    return {
                        success: true,
                        results: results
                    };
                }
            },
            ignoreCase: true,
            fullTextSearch: true,
            filterRemoteData: true,
            saveRemoteData: true,
            allowCategorySelection: false,
            forceSelection: forceSelection,  // Use the forceSelection parameter
            hideDividers: 'empty',
            direction: 'downward',
            onChange: function(value, text, $choice) {
                // Update hidden input fields for provider
                $('input[name="provider"], input[name="providerid"]').val(value).trigger('change');
                
                // Call the provided callback if it exists
                if (typeof callback === 'function') {
                    callback(value, text, $choice);
                }
            }
        };
    }
};