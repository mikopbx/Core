/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * OutWorkTimesAPI - REST API for out-of-work-times management with enhanced security
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
const OutWorkTimesAPI = {
    /**
     * API endpoints configuration
     */
    endpoints: {
        getList: '/pbxcore/api/v2/out-work-times/getList',
        getRecord: '/pbxcore/api/v2/out-work-times/getRecord',
        saveRecord: '/pbxcore/api/v2/out-work-times/saveRecord',
        deleteRecord: '/pbxcore/api/v2/out-work-times/deleteRecord',
        changePriority: '/pbxcore/api/v2/out-work-times/changePriority'
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
                    response.data = this.sanitizeTimeConditionData(response.data);
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
                    // Sanitize array of time conditions
                    response.data = response.data.map(function(item) {
                        return this.sanitizeTimeConditionData(item);
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
        if (!this.validateTimeConditionData(data)) {
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
                    response.data = this.sanitizeTimeConditionData(response.data);
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
     * Change priority for multiple records
     * 
     * @param {object} priorityData - Object with record IDs as keys and priorities as values
     * @param {function} callback - Callback function
     */
    changePriority: function(priorityData, callback) {
        $.api({
            url: this.endpoints.changePriority,
            method: 'POST',
            data: {priorities: priorityData},
            on: 'now',
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback({result: false});
            }
        });
    },
    
    /**
     * Sanitize time condition data for safe display
     * 
     * @param {object} data - Raw time condition data
     * @returns {object} Sanitized data
     */
    sanitizeTimeConditionData: function(data) {
        if (!data) return data;
        
        // Create a copy to avoid modifying original
        const sanitized = {...data};
        
        // Sanitize text fields for XSS protection
        const textFields = ['description', 'calTypeDisplay'];
        textFields.forEach(function(field) {
            if (sanitized[field] && typeof sanitized[field] === 'string') {
                sanitized[field] = SecurityUtils.escapeHtml(sanitized[field]);
            }
        });
        
        // Sanitize nested objects
        if (sanitized.routing && typeof sanitized.routing === 'object') {
            ['failover', 'audioMessage'].forEach(function(field) {
                if (sanitized.routing[field] && typeof sanitized.routing[field] === 'string') {
                    sanitized.routing[field] = SecurityUtils.escapeHtml(sanitized.routing[field]);
                }
            });
        }
        
        // Sanitize incoming routes array
        if (Array.isArray(sanitized.incomingRoutes)) {
            sanitized.incomingRoutes = sanitized.incomingRoutes.map(function(route) {
                const sanitizedRoute = {...route};
                ['rulename', 'number', 'provider'].forEach(function(field) {
                    if (sanitizedRoute[field] && typeof sanitizedRoute[field] === 'string') {
                        sanitizedRoute[field] = SecurityUtils.escapeHtml(sanitizedRoute[field]);
                    }
                });
                return sanitizedRoute;
            });
        }
        
        return sanitized;
    },
    
    /**
     * Validate time condition data before sending
     * 
     * @param {object} data - Data to validate
     * @returns {boolean} True if valid
     */
    validateTimeConditionData: function(data) {
        // No required fields - description is optional
        
        // calType can be empty string (which means 'timeframe') or have a value
        // Empty string is valid for 'timeframe' type
        if (data.calType === undefined || data.calType === null) {
            console.warn('Calendar type is required');
            return false;
        }
        
        // Validate calendar-specific fields only if calType is not empty (not 'timeframe')
        if (data.calType && data.calType !== '') {
            switch(data.calType) {
                case 'date':
                    if (!data.date_from || !data.date_to) {
                        console.warn('Date range is required for date type');
                        return false;
                    }
                    break;
                case 'weekday':
                    if (!data.weekday_from || !data.weekday_to) {
                        console.warn('Weekday range is required for weekday type');
                        return false;
                    }
                    break;
                case 'time':
                    if (!data.time_from || !data.time_to) {
                        console.warn('Time range is required for time type');
                        return false;
                    }
                    break;
            }
        }
        
        return true;
    }
};