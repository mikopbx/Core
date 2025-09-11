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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, DynamicDropdownBuilder, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, PasswordWidget */

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
     * Initialize the provider form
     */
    initialize() {
        const providerId = $('#id').val() || '';
        const currentDescription = this.$description.val() || '';
        
        // Check for copy mode from URL parameter or hidden field
        const copyFromId = $('#copy-from-id').val();
        const urlParams = new URLSearchParams(window.location.search);
        const copyParam = urlParams.get('copy');
        
        let requestId = providerId;
        this.isCopyMode = false; // Save as class property
        
        if (copyParam || copyFromId) {
            requestId = 'copy-' + (copyParam || copyFromId);
            this.isCopyMode = true;
        }
        
        // Determine if this is a new provider
        // New providers have empty ID or 'new' as ID in the URL, or are in copy mode
        this.isNewProvider = !providerId || providerId === '' || providerId === 'new' || this.isCopyMode;
        
        // Update header immediately for better UX
        this.updatePageHeader(currentDescription);
        
        // Show loading state
        this.showLoadingState();
        
        // Load provider data from REST API
        ProvidersAPI.getRecord(requestId, this.providerType, (response) => {
            this.hideLoadingState();
            
            if (response.result && response.data) {
                // Store provider data for later use
                this.providerData = response.data;
                this.populateFormData(response.data);
            } else if (providerId && providerId !== 'new') {
                UserMessage.showMultiString(response.messages);
            }
            
            // Initialize dynamic dropdowns with API data (V5.0 pattern)
            // For both new and existing records - API provides complete data with defaults
            const dropdownData = (response.result && response.data) ? response.data : {};
            this.initializeDropdownsWithData(dropdownData);
            
            // Continue with initialization
            this.initializeUIComponents();
            
            this.initializeEventHandlers();
            this.initializeForm();
            this.updateVisibilityElements();
            
            // Mark form as changed if in copy mode to enable save button
            if (this.isCopyMode) {
                Form.dataChanged();
            }
            
            // Initialize tooltip popups
            this.$popuped.popup();
            
            // Prevent browser password manager for generated passwords
            this.$secret.on('focus', () => {
                this.$secret.attr('autocomplete', 'new-password');
            });
        });
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        this.$checkBoxes.checkbox();
        this.initializeAccordion();
        
        // Dynamic dropdowns are initialized after data is loaded with provider data
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
            apiUrl: `/pbxcore/api/v2/network-filters/getForSelect?categories[]=${category}`,
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
     */
    initializeEventHandlers() {
        const self = this;
        
        // Update header when provider name changes
        this.$description.on('input', function() {
            self.updatePageHeader($(this).val());
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
     * Populate form with data from API
     * @param {object} data - Provider data from API
     */
    populateFormData(data) {
        
        // Common fields
        if (data.id) {
            $('#id').val(data.id);
        }
        if (data.description) {
            this.$description.val(data.description);
            // Update page header with provider name and type
            this.updatePageHeader(data.description);
        }
        if (data.note) {
            $('#note').val(data.note);
        }
        
        // Common provider fields - backend provides defaults
        $('#username').val(data.username || '');
        this.$secret.val(data.secret || '');
        $('#host').val(data.host || '');
        $('#registration_type').val(data.registration_type || '');
        $('#networkfilterid').val(data.networkfilterid || '');
        $('#manualattributes').val(data.manualattributes || '');
        $('#port').val(data.port || '');
        
        // Common checkboxes - handle both string '1' and boolean true
        // These checkboxes use standard HTML checkbox behavior
        $('#qualify').prop('checked', data.qualify === '1' || data.qualify === true);
        $('#receive_calls_without_auth').prop('checked', data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true);
        $('#noregister').prop('checked', data.noregister === '1' || data.noregister === true);
        
        // Disabled state - this is a hidden field, not a checkbox
        $('#disabled').val(data.disabled ? '1' : '0');
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
            const newProviderText = globalTranslate.pr_NewProvider || 'New Provider';
            headerText = `${newProviderText} (${providerTypeText})`;
        }
        
        // Update main header content
        $('h1 .content').text(headerText);
    }
}