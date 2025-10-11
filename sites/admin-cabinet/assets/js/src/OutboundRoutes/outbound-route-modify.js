/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProvidersAPI, UserMessage, OutboundRouteTooltipManager, DynamicDropdownBuilder */

/**
 * Object for managing outbound route settings
 * @module outboundRoute
 */
const outboundRoute = {
    /**
     * jQuery object for the form
     * @type {jQuery}
     */
    $formObj: $('#outbound-route-form'),
    
    /**
     * Route data from API
     * @type {Object|null}
     */
    routeData: null,
    
    /**
     * Validation rules for the form fields before submission
     * @type {object}
     */
    validateRules: { 
        rulename: {
            identifier: 'rulename',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseEnterRuleName,
                },
            ],
        },
        providerid: {
            identifier: 'providerid',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.or_ValidationPleaseSelectProvider,
                },
            ],
        },
        numberbeginswith: {
            identifier: 'numberbeginswith',
            rules: [
                {
                    type: 'regExp',
                    value: '/^(|[0-9#+\\*()\\[\\-\\]\\{\\}|]{1,64})$/',
                    prompt: globalTranslate.or_ValidateBeginPattern,
                },
            ],
        },
        restnumbers: {
            identifier: 'restnumbers',
            optional: true,
            rules: [
                {
                    type: 'integer[-1..20]',
                    prompt: globalTranslate.or_ValidateRestNumbers,
                },
            ],
        },
        trimfrombegin: {
            identifier: 'trimfrombegin',
            optional: true,
            rules: [
                {
                    type: 'integer[0..30]',
                    prompt: globalTranslate.or_ValidateTrimFromBegin,
                },
            ],
        },
        prepend: {
            identifier: 'prepend',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '/^[0-9#*+]{0,20}$/',
                    prompt: globalTranslate.or_ValidatePrepend,
                },
            ],
        },
    },
    
    /**
     * Initializes the outbound route form
     */
    initialize() {
        // Get route ID from form or URL
        const routeId = this.getRouteId();
        
        // Note: Provider dropdown will be initialized after data is loaded
        
        // Load route data
        this.loadRouteData(routeId);
        
        this.initializeForm();
        this.initializeTooltips();
    },
    
    /**
     * Get route ID from form or URL
     */
    getRouteId() {
        // Try to get from form first
        let routeId = this.$formObj.form('get value', 'id');
        
        // If not in form, try to get from URL
        if (!routeId) {
            const urlParts = window.location.pathname.split('/');
            const modifyIndex = urlParts.indexOf('modify');
            if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
                routeId = urlParts[modifyIndex + 1];
            }
        }
        
        return routeId || 'new';
    },
    
    
    /**
     * Load route data from API
     * @param {string} routeId - Route ID or 'new'
     */
    loadRouteData(routeId) {
        // Check for copy parameter
        const urlParams = new URLSearchParams(window.location.search);
        const copySource = urlParams.get('copy');
        
        if (copySource) {
            // Use the new RESTful copy method: /outbound-routes/{id}:copy
            OutboundRoutesAPI.callCustomMethod('copy', {id: copySource}, (response) => {
                if (response.result) {
                    // Data is already prepared by backend with new ID and priority
                    this.routeData = response.data;
                    this.populateForm(response.data);
                    
                    // Mark form as changed for copy operation
                    Form.dataChanged();
                } else {
                    // V5.0: No fallback - show error and stop
                    const errorMessage = response.messages && response.messages.error ? 
                        response.messages.error.join(', ') : 
                        'Failed to copy outbound route data';
                    UserMessage.showError(errorMessage);
                }
            });
            return;
        }
        
        // Regular load or new record - always use REST API (V5.0 architecture)
        // Use getRecord which automatically handles :getDefault for new records
        const requestId = routeId === 'new' ? '' : routeId;
        
        OutboundRoutesAPI.getRecord(requestId, (response) => {
            if (response.result) {
                // Mark as new record if we don't have an ID
                if (routeId === 'new') {
                    response.data._isNew = true;
                }
                
                this.routeData = response.data;
                this.populateForm(response.data);
            } else {
                // V5.0: No fallback - show error and stop
                const errorMessage = response.messages && response.messages.error ? 
                    response.messages.error.join(', ') : 
                    `Failed to load outbound route data${routeId === 'new' ? ' (default values)' : ''}`;
                UserMessage.showError(errorMessage);
            }
        });
    },
    
    /**
     * Populate form with route data
     * @param {Object} data - Route data
     */
    populateForm(data) {
        // Use unified silent population approach
        Form.populateFormSilently({
            id: data.id || '',
            rulename: data.rulename || '',
            providerid: data.providerid || '',
            priority: data.priority || '',
            numberbeginswith: data.numberbeginswith || '',
            restnumbers: data.restnumbers === '-1' ? '' : (data.restnumbers || ''),
            trimfrombegin: data.trimfrombegin || '0',
            prepend: data.prepend || '',
            note: data.note || ''
        }, {
            afterPopulate: (formData) => {
                // Initialize provider dropdown with data using v3 API
                DynamicDropdownBuilder.buildDropdown('providerid', data, {
                    apiUrl: '/pbxcore/api/v3/providers:getForSelect',
                    placeholder: globalTranslate.or_SelectProvider,
                    onChange: function(value, text) {
                        Form.dataChanged();
                    }
                });
                
                // Update page header if we have a representation
                if (data.represent) {
                    $('.page-header .header').text(data.represent);
                }
            }
        });
    },
    
    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = outboundRoute.$formObj.form('get values');
        
        // Handle empty restnumbers
        if (result.data.restnumbers === '') {
            result.data.restnumbers = '-1';
        }
        
        return result;
    },
    
    /**
     * Callback function to be called after the form has been sent
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result && response.data) {
            // Update form with response data
            outboundRoute.populateForm(response.data);

            // Form.js will handle all redirect logic based on submitMode
        }
    },
    
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = outboundRoute.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = outboundRoute.validateRules;
        Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
        Form.cbAfterSendForm = outboundRoute.cbAfterSendForm;
        
        // REST API integration - use built-in Form support
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = OutboundRoutesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}outbound-routes/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}outbound-routes/modify/`;
        
        Form.initialize();
    },
    
    /**
     * Initialize tooltips for form fields using OutboundRouteTooltipManager
     */
    initializeTooltips() {
        // Delegate tooltip initialization to OutboundRouteTooltipManager
        OutboundRouteTooltipManager.initialize();
    }
};

// Initialize on document ready
$(document).ready(() => {
    outboundRoute.initialize();
});