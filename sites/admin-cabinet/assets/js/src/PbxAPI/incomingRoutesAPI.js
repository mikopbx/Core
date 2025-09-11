/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * IncomingRoutesAPI - REST API for incoming routes management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
const IncomingRoutesAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/incoming-routes/getList',
        getRecord: '/pbxcore/api/v2/incoming-routes/getRecord',
        saveRecord: '/pbxcore/api/v2/incoming-routes/saveRecord',
        deleteRecord: '/pbxcore/api/v2/incoming-routes/deleteRecord',
        changePriority: '/pbxcore/api/v2/incoming-routes/changePriority'
    },
    
    /**
     * Get record by ID with security processing
     * 
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord: function(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: this.endpoints.getRecord + '/' + recordId,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize data for display
                    response.data = this.sanitizeRouteData(response.data);
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
     * Get list of all records with security processing
     * 
     * @param {function} callback - Callback function
     */
    getList: function(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize array of routes
                    response.data = response.data.map(function(item) {
                        return this.sanitizeRouteData(item);
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
     * Save record with validation and security
     * 
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord: function(data, callback) {
        // Client-side validation
        if (!this.validateRouteData(data)) {
            callback({
                result: false, 
                messages: {error: ['Client-side validation failed']}
            });
            return;
        }
        
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? 
            this.endpoints.saveRecord + '/' + data.id : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    response.data = this.sanitizeRouteData(response.data);
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
     * Delete record
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
     * Change priority of incoming routes
     * 
     * @param {object} priorities - Map of route ID to new priority value
     * @param {function} callback - Callback function
     */
    changePriority: function(priorities, callback) {
        $.api({
            url: this.endpoints.changePriority,
            method: 'POST',
            data: {priorities: priorities},
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
     * Sanitize route data for secure display
     * Data comes from API already properly escaped, so no additional escaping needed
     * 
     * @param {object} data - Route data from API (already sanitized)
     * @return {object} Data ready for display
     */
    sanitizeRouteData: function(data) {
        if (!data) return data;
        
        return {
            id: data.id,
            number: data.number || '',
            providerid: data.providerid || '',  // Provider ID (unified field name)
            providerName: data.providerName || '',
            providerType: data.providerType || '',
            providerDisabled: !!data.providerDisabled,
            priority: parseInt(data.priority) || 0,
            timeout: parseInt(data.timeout) || 18,
            extension: data.extension || '',
            extensionName: data.extensionName || '',
            extension_represent: data.extension_represent || '',
            providerid_represent: data.providerid_represent || '',
            audio_message_id: data.audio_message_id || '',
            audio_message_id_represent: data.audio_message_id_represent || '',
            note: data.note || '',
            disabled: !!data.disabled,
            rulename: data.rulename || '',
            // Use rule_represent for display in tables
            rule_represent: data.rule_represent || ''
        };
    },
    
    /**
     * Client-side validation
     * 
     * @param {object} data - Data to validate
     * @return {boolean} Validation result
     */
    validateRouteData: function(data) {
        // DID number validation (digits only)
        if (data.number && !/^[0-9]*$/.test(data.number)) {
            return false;
        }
        
        // Extension validation (if provided)
        // Allow special service values and numeric extensions
        const specialExtensions = ['busy', 'hangup', 'voicemail', 'did2user'];
        if (data.extension && 
            !specialExtensions.includes(data.extension) && 
            !/^[0-9]+$/.test(data.extension)) {
            return false;
        }
        
        // Priority validation
        if (data.priority !== undefined && data.priority !== null) {
            const priority = parseInt(data.priority);
            if (isNaN(priority) || priority < 0) {
                return false;
            }
        }
        
        // Timeout validation
        if (data.timeout !== undefined && data.timeout !== null) {
            const timeout = parseInt(data.timeout);
            if (isNaN(timeout) || timeout < 0 || timeout > 300) {
                return false;
            }
        }
        
        return true;
    }
};