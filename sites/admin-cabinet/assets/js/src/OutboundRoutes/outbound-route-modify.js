/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProviderSelector, UserMessage, TooltipBuilder */

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
     * jQuery object for provider dropdown
     * @type {jQuery}
     */
    $providerDropDown: $('.ui.dropdown#providerid-dropdown'),
    
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
        
        // Load route data (will initialize dropdown with data)
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
     * Initialize provider dropdown with settings
     * @param {string} currentValue - Current provider ID value
     * @param {string} currentText - Current provider representation text
     */
    initializeProviderDropdown(currentValue = null, currentText = null) {
        // Use the new ProviderSelector component
        ProviderSelector.init('#providerid-dropdown', {
            includeNone: false,     // No 'none' option for outbound routes
            forceSelection: true,   // Provider is mandatory
            hiddenFieldId: 'providerid',  // Consistent field name
            currentValue: currentValue,  // Pass current value for initialization
            currentText: currentText,    // Pass current text for initialization
            onChange: () => {
                Form.dataChanged();
            }
        });
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
            // Load source route data for copying
            OutboundRoutesAPI.getRecordWithCopy('new', copySource, (response) => {
                if (response.result) {
                    // Clear the id to ensure it's treated as a new record
                    const copyData = response.data;
                    copyData.id = '';
                    
                    this.routeData = copyData;
                    this.populateForm(copyData);
                    
                    // Mark form as changed for copy operation
                    Form.dataChanged();
                } else {
                    const errorMessage = response.messages && response.messages.error ? 
                        response.messages.error.join(', ') : 
                        'Failed to load source data for copying';
                    UserMessage.showError(errorMessage);
                }
            });
            return;
        }
        
        // Regular load
        OutboundRoutesAPI.getRecord(routeId, (response) => {
            if (response.result) {
                this.routeData = response.data;
                this.populateForm(response.data);
            } else {
                // If no data or error, initialize with empty dropdown
                this.initializeProviderDropdown();
                
                if (routeId !== 'new') {
                    UserMessage.showMultiString(response.messages);
                }
            }
        });
    },
    
    /**
     * Populate form with route data
     * @param {Object} data - Route data
     */
    populateForm(data) {
        // Set form values (API now uses 'providerid')
        this.$formObj.form('set values', {
            id: data.id || '',
            rulename: data.rulename || '',
            providerid: data.providerid || '',
            priority: data.priority || '',
            numberbeginswith: data.numberbeginswith || '',
            restnumbers: data.restnumbers === '-1' ? '' : (data.restnumbers || ''),
            trimfrombegin: data.trimfrombegin || '0',
            prepend: data.prepend || '',
            note: data.note || ''
        });
        
        // Initialize provider dropdown with current value and representation
        const providerValue = data.providerid || null;
        const providerText = data.providerRepresent || data.providerName || null;
        
        // Initialize provider dropdown once with all data
        this.initializeProviderDropdown(providerValue, providerText);
        
        // Update page header if we have a representation
        if (data.represent) {
            $('.page-header .header').text(data.represent);
        }
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
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.id);
                window.history.pushState(null, '', newUrl);
            }
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
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Configuration for each field tooltip
        const tooltipConfigs = {
            numberbeginswith: {
                header: globalTranslate.or_numberbeginswith_tooltip_header,
                description: globalTranslate.or_numberbeginswith_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.or_numberbeginswith_tooltip_patterns_header,
                        definition: null
                    },
                    globalTranslate.or_numberbeginswith_tooltip_pattern1,
                    globalTranslate.or_numberbeginswith_tooltip_pattern2,
                    globalTranslate.or_numberbeginswith_tooltip_pattern3,
                    globalTranslate.or_numberbeginswith_tooltip_pattern4,
                    globalTranslate.or_numberbeginswith_tooltip_pattern5,
                    globalTranslate.or_numberbeginswith_tooltip_pattern6,
                    globalTranslate.or_numberbeginswith_tooltip_pattern7
                ],
                list2: [
                    {
                        term: globalTranslate.or_numberbeginswith_tooltip_advanced_header,
                        definition: null
                    },
                    globalTranslate.or_numberbeginswith_tooltip_advanced1,
                    globalTranslate.or_numberbeginswith_tooltip_advanced2,
                    globalTranslate.or_numberbeginswith_tooltip_advanced3
                ],
                list3: [
                    {
                        term: globalTranslate.or_numberbeginswith_tooltip_limitations_header,
                        definition: null
                    },
                    globalTranslate.or_numberbeginswith_tooltip_limitation1,
                    globalTranslate.or_numberbeginswith_tooltip_limitation2,
                    globalTranslate.or_numberbeginswith_tooltip_limitation3
                ],
                warning: {
                    text: globalTranslate.or_numberbeginswith_tooltip_warning
                },
                note: globalTranslate.or_numberbeginswith_tooltip_note
            },
            
            restnumbers: {
                header: globalTranslate.or_restnumbers_tooltip_header,
                description: globalTranslate.or_restnumbers_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.or_restnumbers_tooltip_values_header,
                        definition: null
                    },
                    globalTranslate.or_restnumbers_tooltip_value1,
                    globalTranslate.or_restnumbers_tooltip_value2,
                    globalTranslate.or_restnumbers_tooltip_value3
                ],
                list2: [
                    {
                        term: globalTranslate.or_restnumbers_tooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.or_restnumbers_tooltip_example1,
                    globalTranslate.or_restnumbers_tooltip_example2,
                    globalTranslate.or_restnumbers_tooltip_example3,
                    globalTranslate.or_restnumbers_tooltip_example4,
                    globalTranslate.or_restnumbers_tooltip_example5,
                    globalTranslate.or_restnumbers_tooltip_example6
                ],
                list3: [
                    {
                        term: globalTranslate.or_restnumbers_tooltip_limitations_header,
                        definition: null
                    },
                    globalTranslate.or_restnumbers_tooltip_limitation1,
                    globalTranslate.or_restnumbers_tooltip_limitation2,
                    globalTranslate.or_restnumbers_tooltip_limitation3
                ],
                note: globalTranslate.or_restnumbers_tooltip_note
            },
            
            trimfrombegin: {
                header: globalTranslate.or_trimfrombegin_tooltip_header,
                description: globalTranslate.or_trimfrombegin_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.or_trimfrombegin_tooltip_why_header,
                        definition: null
                    },
                    globalTranslate.or_trimfrombegin_tooltip_why1,
                    globalTranslate.or_trimfrombegin_tooltip_why2,
                    globalTranslate.or_trimfrombegin_tooltip_why3
                ],
                list2: [
                    {
                        term: globalTranslate.or_trimfrombegin_tooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.or_trimfrombegin_tooltip_example1,
                    globalTranslate.or_trimfrombegin_tooltip_example2,
                    globalTranslate.or_trimfrombegin_tooltip_example3,
                    globalTranslate.or_trimfrombegin_tooltip_example4
                ],
                list3: [
                    {
                        term: globalTranslate.or_trimfrombegin_tooltip_limitation_header,
                        definition: null
                    },
                    globalTranslate.or_trimfrombegin_tooltip_limitation1,
                    globalTranslate.or_trimfrombegin_tooltip_limitation2
                ],
                note: globalTranslate.or_trimfrombegin_tooltip_note
            },
            
            prepend: {
                header: globalTranslate.or_prepend_tooltip_header,
                description: globalTranslate.or_prepend_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.or_prepend_tooltip_usage_header,
                        definition: null
                    },
                    globalTranslate.or_prepend_tooltip_usage1,
                    globalTranslate.or_prepend_tooltip_usage2,
                    globalTranslate.or_prepend_tooltip_usage3
                ],
                list2: [
                    {
                        term: globalTranslate.or_prepend_tooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.or_prepend_tooltip_example1,
                    globalTranslate.or_prepend_tooltip_example2,
                    globalTranslate.or_prepend_tooltip_example3
                ],
                list3: [
                    {
                        term: globalTranslate.or_prepend_tooltip_limitations_header,
                        definition: null
                    },
                    globalTranslate.or_prepend_tooltip_limitation1,
                    globalTranslate.or_prepend_tooltip_limitation2,
                    globalTranslate.or_prepend_tooltip_limitation3
                ],
                note: globalTranslate.or_prepend_tooltip_note
            },
            
            provider: {
                header: globalTranslate.or_provider_tooltip_header,
                description: globalTranslate.or_provider_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.or_provider_tooltip_important_header,
                        definition: null
                    },
                    globalTranslate.or_provider_tooltip_important1,
                    globalTranslate.or_provider_tooltip_important2,
                    globalTranslate.or_provider_tooltip_important3
                ],
                list2: [
                    {
                        term: globalTranslate.or_provider_tooltip_priority_header,
                        definition: null
                    },
                    globalTranslate.or_provider_tooltip_priority1,
                    globalTranslate.or_provider_tooltip_priority2,
                    globalTranslate.or_provider_tooltip_priority3
                ],
                note: globalTranslate.or_provider_tooltip_note
            }
        };
        
        // Use TooltipBuilder to initialize tooltips
        TooltipBuilder.initialize(tooltipConfigs);
    }
};

// Initialize on document ready
$(document).ready(() => {
    outboundRoute.initialize();
});