/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * OutboundRoutesAPI - REST API for outbound routes management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
const OutboundRoutesAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/outbound-routes/getList',
        getRecord: '/pbxcore/api/v2/outbound-routes/getRecord',
        saveRecord: '/pbxcore/api/v2/outbound-routes/saveRecord',
        deleteRecord: '/pbxcore/api/v2/outbound-routes/deleteRecord',
        changePriority: '/pbxcore/api/v2/outbound-routes/changePriority'
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
     * Get record with copy source
     * 
     * @param {string} id - Record ID (usually 'new')
     * @param {string} copySource - Source record ID to copy from
     * @param {function} callback - Callback function
     */
    getRecordWithCopy: function(id, copySource, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        const url = this.endpoints.getRecord + '/' + recordId + '?copy-source=' + copySource;
        
        $.api({
            url: url,
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
     * Change priority of outbound routes
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
            uniqid: data.uniqid,
            rulename: data.rulename || '',
            priority: parseInt(data.priority) || 0,
            numberbeginswith: data.numberbeginswith || '',
            restnumbers: data.restnumbers || '-1',
            trimfrombegin: data.trimfrombegin || '0',
            prepend: data.prepend || '',
            provider: data.provider || '',
            providerName: data.providerName || '',
            providerType: data.providerType || '',
            providerDisabled: !!data.providerDisabled,
            note: data.note || '',
            disabled: !!data.disabled
        };
    },
    
    /**
     * Client-side validation
     * 
     * @param {object} data - Data to validate
     * @return {boolean} Validation result
     */
    validateRouteData: function(data) {
        // Rule name validation (required)
        if (!data.rulename || data.rulename.trim() === '') {
            return false;
        }
        
        // Provider validation (required for outbound routes)
        if (!data.provider || data.provider === 'none') {
            return false;
        }
        
        // Number begins with pattern validation
        // Allow: digits, #, +, *, (, ), [, ], -, {, }, |
        if (data.numberbeginswith && !/^[0-9#+\*\(\)\[\]\-\{\}\|]*$/.test(data.numberbeginswith)) {
            return false;
        }
        
        // Rest numbers validation (-1 or 0-20)
        if (data.restnumbers !== undefined && data.restnumbers !== null && data.restnumbers !== '') {
            const restNum = parseInt(data.restnumbers);
            if (isNaN(restNum) || (restNum !== -1 && (restNum < 0 || restNum > 20))) {
                return false;
            }
        }
        
        // Trim from begin validation (0-30)
        if (data.trimfrombegin !== undefined && data.trimfrombegin !== null && data.trimfrombegin !== '') {
            const trimNum = parseInt(data.trimfrombegin);
            if (isNaN(trimNum) || trimNum < 0 || trimNum > 30) {
                return false;
            }
        }
        
        // Prepend validation (only digits, #, *, +, max 20 chars)
        if (data.prepend && !/^[0-9#*+]{0,20}$/.test(data.prepend)) {
            return false;
        }
        
        // Priority validation
        if (data.priority !== undefined && data.priority !== null) {
            const priority = parseInt(data.priority);
            if (isNaN(priority) || priority < 0) {
                return false;
            }
        }
        
        return true;
    }
};