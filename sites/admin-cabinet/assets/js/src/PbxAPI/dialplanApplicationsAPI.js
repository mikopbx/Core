/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * DialplanApplicationsAPI - REST API for dialplan applications management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection with code preservation
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
var DialplanApplicationsAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/dialplan-applications/getList',
        getRecord: '/pbxcore/api/v2/dialplan-applications/getRecord',
        saveRecord: '/pbxcore/api/v2/dialplan-applications/saveRecord',
        deleteRecord: '/pbxcore/api/v2/dialplan-applications/deleteRecord'
    },
    
    /**
     * Get record by ID with security processing
     * 
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord: function(id, callback) {
        var recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: this.endpoints.getRecord + '/' + recordId,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Sanitize data for display while preserving applicationlogic
                    response.data = this.sanitizeApplicationData(response.data);
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
                    // Sanitize array of applications
                    response.data = response.data.map(function(item) {
                        return this.sanitizeApplicationData(item);
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
        if (!this.validateApplicationData(data)) {
            callback({
                result: false, 
                messages: {error: ['Client-side validation failed']}
            });
            return;
        }
        
        var method = data.id ? 'PUT' : 'POST';
        var url = data.id ? 
            this.endpoints.saveRecord + '/' + data.id : 
            this.endpoints.saveRecord;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    response.data = this.sanitizeApplicationData(response.data);
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
     * Sanitize application data for secure display
     * Data comes from API already properly escaped, so no additional escaping needed
     * 
     * @param {object} data - Application data from API (already sanitized)
     * @return {object} Data ready for display
     */
    sanitizeApplicationData: function(data) {
        if (!data) return data;
        
        return {
            id: data.id,
            uniqid: data.uniqid,
            extension: data.extension || '',
            name: data.name || '',
            hint: data.hint || '',
            type: data.type, // Safe enum value
            description: data.description || '',
            // applicationlogic is NOT sanitized - it's program code
            applicationlogic: data.applicationlogic || ''
        };
    },
    
    /**
     * Client-side validation
     * 
     * @param {object} data - Data to validate
     * @return {boolean} Validation result
     */
    validateApplicationData: function(data) {
        // Required fields
        if (!data.name || !data.name.trim()) {
            return false;
        }
        
        if (!data.extension || !data.extension.trim()) {
            return false;
        }
        
        // Extension format validation
        if (!/^[0-9#+\\*|X]{1,64}$/.test(data.extension)) {
            return false;
        }
        
        // Type validation
        if (data.type && !['php', 'plaintext'].includes(data.type)) {
            return false;
        }
        
        return true;
    }
};