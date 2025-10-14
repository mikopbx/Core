/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, DynamicDropdownBuilder, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI, PasswordWidget */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
class ProviderBase {
    // Class constants for selectors
    static SELECTORS = {
        FORM: '#save-provider-form',
        SECRET: '#secret',
        CHECKBOXES: '#save-provider-form .checkbox',
        ACCORDIONS: '#save-provider-form .ui.accordion',
        DESCRIPTION: '#description',
        PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
        POPUPED: '.popuped'
    };


    /**
     * Constructor
     * @param {string} providerType - Type of provider (SIP or IAX)
     */
    constructor(providerType) {
        this.providerType = providerType;
        // Cache jQuery objects
        this.$formObj = $(ProviderBase.SELECTORS.FORM);
        this.$secret = $(ProviderBase.SELECTORS.SECRET);
        this.$checkBoxes = $(ProviderBase.SELECTORS.CHECKBOXES);
        this.$accordions = $(ProviderBase.SELECTORS.ACCORDIONS);
        this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
        this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
        this.$popuped = $(ProviderBase.SELECTORS.POPUPED);
        
        // Track if this is a new provider (not existing in database)
        this.isNewProvider = false;
        
        // Track if form is fully initialized
        this.formInitialized = false;
        
        // Host input validation regex
        this.hostInputValidation = new RegExp(
            '^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}'
            + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])'
            + '(\\/(\d|[1-2]\d|3[0-2]))?'
            + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$',
            'gm'
        );
    }

    /**
     * Initialize the provider form following CallQueues pattern
     *
     * Flow:
     * 1. Initialize UI components first (synchronous)
     * 2. Initialize form with validation
     * 3. Load data from API (asynchronous, last)
     */
    initialize() {
        // 1. Initialize UI components first (synchronous)
        this.initializeUIComponents();

        // 2. Initialize event handlers
        this.initializeEventHandlers();

        // 3. Initialize form with REST API settings (before loading data)
        this.initializeForm();

        // 4. Load form data via REST API (last, after all UI is initialized)
        this.loadFormData();
    }

    /**
     * Load form data via REST API
     * This is called last, after all UI components are initialized
     */
    loadFormData() {
        const providerId = $('#id').val() || '';
        const currentDescription = this.$description.val() || '';

        // Check for copy mode from URL parameter or hidden field
        const copyFromId = $('#copy-from-id').val();
        const urlParams = new URLSearchParams(window.location.search);
        const copyParam = urlParams.get('copy');

        this.isCopyMode = false; // Save as class property

        // Select appropriate API client based on provider type
        let apiClient;
        if (this.providerType === 'SIP') {
            apiClient = SipProvidersAPI;
        } else if (this.providerType === 'IAX') {
            apiClient = IaxProvidersAPI;
        } else {
            apiClient = ProvidersAPI;
        }

        // Show loading state
        this.showLoadingState();

        // Update header immediately for better UX
        this.updatePageHeader(currentDescription);

        if (copyParam || copyFromId) {
            // Copy mode - use the new RESTful copy endpoint
            const sourceId = copyParam || copyFromId;
            this.isCopyMode = true;
            this.isNewProvider = true; // Copy creates a new provider

            // Call the copy custom method
            apiClient.callCustomMethod('copy', {id: sourceId}, (response) => {
                this.hideLoadingState();
                if (response.result && response.data) {
                    // Mark as new record for copy
                    response.data._isNew = true;

                    this.populateForm(response.data);

                    // Mark form as changed to enable save button
                    Form.dataChanged();
                } else {
                    // Show error
                    UserMessage.showMultiString(response.messages);
                }
            });
        } else {
            // Determine if this is a new provider
            this.isNewProvider = !providerId || providerId === '' || providerId === 'new';

            // Use getRecord method from PbxApiClient
            // It automatically handles new records (calls getDefault) and existing records
            apiClient.getRecord(providerId || 'new', (response) => {
                this.hideLoadingState();
                if (response.result && response.data) {
                    // Mark as new record if we don't have an ID
                    if (!response.data.id || response.data.id === '') {
                        response.data._isNew = true;
                        this.isNewProvider = true;
                    }

                    this.populateForm(response.data);
                } else {
                    // Show error for existing records that failed to load
                    if (providerId && providerId !== 'new') {
                        UserMessage.showMultiString(response.messages);
                    }
                }
            });
        }
    }

    /**
     * Populate form with data from REST API
     * Following CallQueues pattern with initializeDropdownsWithData
     * @param {Object} data - Form data from API
     */
    populateForm(data) {
        // Store provider data for later use
        this.providerData = data;

        // Update isNewProvider based on actual data from server
        if (!data.id || data.id === '') {
            this.isNewProvider = true;
        } else {
            this.isNewProvider = false;
        }

        // Use unified silent population approach (CallQueues pattern)
        Form.populateFormSilently(data, {
            beforePopulate: (formData) => {
                // Initialize dropdowns first with form data (only once)
                this.initializeDropdownsWithData(data);
            },
            afterPopulate: (formData) => {
                // Manually populate specific fields if needed by child classes
                this.populateFormData(data);

                // Update visibility based on loaded data
                this.updateVisibilityElements();
            }
        });

        // Initialize tooltip popups after form is populated
        this.$popuped.popup();
    }

    /**
     * Initialize UI components
     * Called first, before data loading
     */
    initializeUIComponents() {
        // Initialize basic UI components (synchronous)
        this.$checkBoxes.checkbox();
        this.initializeAccordion();

        // Initialize tooltip popups
        this.$popuped.popup();

        // Dynamic dropdowns are initialized later in initializeDropdownsWithData (after data is loaded)
    }
    
    /**
     * Initialize all dropdowns following V5.0 clean data pattern
     * Called AFTER populateFormData to ensure clean data flow
     * @param {object} data - Provider data from API containing complete field values and represent text
     */
    initializeDropdownsWithData(data = {}) {
        // Initialize dynamic dropdowns (API-based - uses DynamicDropdownBuilder with complete data)
        this.initializeNetworkFilterDropdown(data);
        
        // Initialize static dropdowns (rendered by PHP - use standard Fomantic UI)
        this.initializeRegistrationTypeDropdown();
    }

    /**
     * Initialize registration type dropdown with standard Fomantic UI (PHP-rendered)
     * This dropdown needs custom onChange for provider-specific visibility logic
     */
    initializeRegistrationTypeDropdown() {
        const $dropdown = $('#registration_type-dropdown');
        
        if ($dropdown.length === 0) {
            return;
        }
        
        // For static dropdowns rendered by PHP, use simple Fomantic UI initialization
        // This dropdown needs custom onChange for complex field visibility logic
        $dropdown.dropdown({
            onChange: (value) => {
                this.updateVisibilityElements();
                // Update validation rules based on registration type
                Form.validateRules = this.getValidateRules();
                Form.dataChanged();
            }
        });
    }
     
    /**
     * Initialize accordion with callbacks
     */
    initializeAccordion() {
        const self = this;
        this.$accordions.accordion({
            onOpen: function() {
                // Update field visibility when accordion opens
                setTimeout(() => {
                    if (typeof self.updateVisibilityElements === 'function') {
                        self.updateVisibilityElements();
                    }
                }, 50);
            }
        });
    }
    
    /**
     * Initialize network filter dropdown following V5.0 clean data pattern
     * @param {object} data - Provider data from API containing networkfilterid and networkfilterid_represent
     */
    initializeNetworkFilterDropdown(data = {}) {
        const category = this.providerType || 'SIP';
        
        // V5.0 pattern: Complete automation - no custom onChange needed
        DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
            apiUrl: `/pbxcore/api/v3/network-filters:getForSelect?categories[]=${category}`,
            placeholder: globalTranslate.pr_NetworkFilter,
            cache: false
            // No onChange callback - DynamicDropdownBuilder handles everything automatically:
            // - Hidden input synchronization
            // - Change event triggering  
            // - Form.dataChanged() notification
            // - Validation error clearing
        });
    }

    /**
     * Initialize event handlers
     * Called after UI components, before form initialization
     */
    initializeEventHandlers() {
        const self = this;

        // Update header when provider name changes
        this.$description.on('input', function() {
            self.updatePageHeader($(this).val());
        });

        // Prevent browser password manager for generated passwords
        this.$secret.on('focus', () => {
            this.$secret.attr('autocomplete', 'new-password');
        });

        // Initialize password widget
        this.initializePasswordWidget();
    }


    
    /**
     * Initialize password widget with default configuration
     */
    initializePasswordWidget() {
        // Initialize the password widget with default configuration
        if (this.$secret.length > 0) {
            // Hide legacy HTML buttons - PasswordWidget will manage its own buttons
            $('.clipboard').hide();
            $('#show-hide-password').hide();
            
            // Default configuration for providers - will be updated based on registration type
            const widget = PasswordWidget.init(this.$secret, {
                validation: PasswordWidget.VALIDATION.SOFT,
                generateButton: true,
                showPasswordButton: true,  // Will be updated based on registration type
                clipboardButton: true,      // Keep copy button for all modes
                showStrengthBar: true,
                showWarnings: true,
                validateOnInput: true,
                checkOnLoad: false, // Don't validate on load, let updateVisibilityElements handle it
                minScore: 60,
                generateLength: 32 // Provider passwords should be 32 chars for better security
            });
            
            // Store widget instance for later use
            this.passwordWidget = widget;
            
            // Update visibility elements now that widget is initialized
            // This will apply the correct configuration based on registration type
            if (typeof this.updateVisibilityElements === 'function') {
                this.updateVisibilityElements();
            }
        }
    }

    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */
    updateVisibilityElements() {
        // Override in child classes to configure PasswordWidget based on registration type
    }
    
    /**
     * Show password tooltip icon when in 'none' registration mode
     */
    showPasswordTooltip() {
        this.$passwordTooltipIcon.show();
    }
    
    /**
     * Hide password tooltip icon
     */
    hidePasswordTooltip() {
        this.$passwordTooltipIcon.hide();
    }

    /**
     * Get validation rules based on provider settings
     * This method should be overridden in child classes
     * @returns {object} Validation rules
     */
    getValidateRules() {
        // Override in child classes
        return {};
    }

    /**
     * Initialize form with validation and callbacks
     * Note: This method is overridden in provider-modify.js to configure REST API
     */
    initializeForm() {
        Form.$formObj = this.$formObj;
        // URL is not set here - child classes configure REST API
        Form.validateRules = this.getValidateRules();
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        Form.initialize();
        
        // Mark form as fully initialized
        this.formInitialized = true;
    }

    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified settings
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        // IMPORTANT: Don't overwrite result.data - it already contains processed checkbox values from Form.js
        // We should only add or modify specific fields
        
        // If result.data is not defined (shouldn't happen), initialize it
        if (!result.data) {
            result.data = this.$formObj.form('get values');
        }
        
        // Network filter value is automatically handled by form serialization
        
        return result;
    }

    /**
     * Callback after form submission
     * @param {object} response - Server response
     */
    cbAfterSendForm(response) {
        // Can be overridden in child classes
    }


    
    /**
     * Show loading state for the form
     */
    showLoadingState() {
        this.$formObj.addClass('loading');
    }
    
    /**
     * Hide loading state for the form
     */
    hideLoadingState() {
        this.$formObj.removeClass('loading');
    }
    
    /**
     * Populate provider-specific form fields
     * Called from populateForm() after Form.populateFormSilently()
     * Override in child classes for provider-specific field population
     * @param {object} data - Provider data from API
     */
    populateFormData(data) {
        // Update page header with provider name
        if (data.description) {
            this.updatePageHeader(data.description);
        }

        // Most fields are now handled by Form.populateFormSilently()
        // This method is for special cases or provider-specific fields
        // Override in child classes (ProviderSIP, ProviderIAX) as needed
    }

    
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     * @deprecated Use TooltipBuilder.buildContent() instead
     */
    buildTooltipContent(tooltipData) {
        return TooltipBuilder.buildContent(tooltipData);
    }
    
    /**
     * Update page header with provider name and type
     * @param {string} providerName - Provider name
     */
    updatePageHeader(providerName) {
        const providerTypeText = this.providerType === 'SIP' ? 'SIP' : 'IAX';
        let headerText;
        
        if (providerName && providerName.trim() !== '') {
            // Existing provider with name
            headerText = `${providerName} (${providerTypeText})`;
        } else {
            // New provider or no name
            const newProviderText = globalTranslate.pr_NewProvider;
            headerText = `${newProviderText} (${providerTypeText})`;
        }
        
        // Update main header content
        $('h1 .content').text(headerText);
    }
}