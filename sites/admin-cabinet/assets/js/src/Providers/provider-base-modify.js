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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, PasswordScore, i18n, ProvidersAPI */

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
        DROPDOWNS: '#save-provider-form .ui.dropdown',
        DESCRIPTION: '#description',
        NETWORK_FILTER_ID: '#networkfilterid',
        SHOW_HIDE_PASSWORD: '#show-hide-password',
        GENERATE_PASSWORD: '#generate-new-password',
        PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
        CLIPBOARD: '.clipboard',
        POPUPED: '.popuped'
    };

    // Class constants for values
    static DEFAULTS = {
        SIP_PORT: '5060',
        IAX_PORT: '4569',
        PASSWORD_LENGTH: 16,
        QUALIFY_FREQ: '60',
        REGISTRATION_TYPE: 'outbound',
        DTMF_MODE: 'auto',
        TRANSPORT: 'UDP',
        NETWORK_FILTER: 'none'
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
        this.$dropDowns = $(ProviderBase.SELECTORS.DROPDOWNS);
        this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
        this.$networkFilterId = $(ProviderBase.SELECTORS.NETWORK_FILTER_ID);
        this.$showHidePassword = $(ProviderBase.SELECTORS.SHOW_HIDE_PASSWORD);
        this.$generatePassword = $(ProviderBase.SELECTORS.GENERATE_PASSWORD);
        this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
        this.$clipboard = $(ProviderBase.SELECTORS.CLIPBOARD);
        this.$popuped = $(ProviderBase.SELECTORS.POPUPED);
        
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
        
        // Update header immediately for better UX
        this.updatePageHeader(currentDescription);
        
        // Show loading state
        this.showLoadingState();
        
        // Load provider data from REST API
        ProvidersAPI.getRecord(providerId, this.providerType, (response) => {
            this.hideLoadingState();
            
            if (response.result && response.data) {
                this.populateFormData(response.data);
            } else if (providerId && providerId !== 'new') {
                UserMessage.showMultiString(response.messages);
            }
            
            // Continue with initialization
            this.initializeUIComponents();
            this.initializeEventHandlers();
            this.initializeForm();
            this.updateVisibilityElements();
            
            // Initialize tooltip popups and clipboard
            this.$popuped.popup();
            this.initializeClipboard();
            
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
        this.$dropDowns.dropdown();
        this.initializeAccordion();
        
        // Initialize dynamic dropdowns
        this.initializeRegistrationTypeDropdown();
        
        // Initialize network filter dropdown
        this.initializeNetworkFilterDropdown();
    }
    
    /**
     * Initialize registration type dropdown dynamically
     */
    initializeRegistrationTypeDropdown() {
        const $field = $('#registration_type');
        if ($field.length === 0) return;
        
        // Check if already inside a dropdown structure
        const $existingDropdown = $field.closest('.ui.dropdown');
        if ($existingDropdown.length > 0) {
            // Already a dropdown, just ensure it's initialized
            if (!$existingDropdown.hasClass('registration-type-dropdown')) {
                $existingDropdown.addClass('registration-type-dropdown');
            }
            $existingDropdown.dropdown({
                onChange: (value) => {
                    this.updateVisibilityElements();
                    // Clear validation errors
                    this.$formObj.find('.field').removeClass('error');
                    this.$formObj.find('.ui.error.message').remove();
                    this.$formObj.find('.prompt').remove();
                    // Update validation rules
                    Form.validateRules = this.getValidateRules();
                    Form.dataChanged();
                }
            });
            return;
        }
        
        const currentValue = $field.val() || ProviderBase.DEFAULTS.REGISTRATION_TYPE;
        const isIAX = this.providerType === 'IAX';
        
        // Build options based on provider type
        const options = [
            { value: 'outbound', text: globalTranslate[isIAX ? 'iax_REG_TYPE_OUTBOUND' : 'sip_REG_TYPE_OUTBOUND'] || 'Outbound' },
            { value: 'inbound', text: globalTranslate[isIAX ? 'iax_REG_TYPE_INBOUND' : 'sip_REG_TYPE_INBOUND'] || 'Inbound' },
            { value: 'none', text: globalTranslate[isIAX ? 'iax_REG_TYPE_NONE' : 'sip_REG_TYPE_NONE'] || 'None' }
        ];
        
        // Create dropdown HTML
        const dropdownHtml = `
            <div class="ui selection dropdown registration-type-dropdown">
                <input type="hidden" name="registration_type" id="registration_type" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${options.find(o => o.value === currentValue)?.text || currentValue}</div>
                <div class="menu">
                    ${options.map(opt => `<div class="item" data-value="${opt.value}">${opt.text}</div>`).join('')}
                </div>
            </div>
        `;
        
        // Replace the field
        $field.replaceWith(dropdownHtml);
        
        // Initialize dropdown
        $('.registration-type-dropdown').dropdown({
            onChange: (value) => {
                this.updateVisibilityElements();
                // Clear validation errors
                this.$formObj.find('.field').removeClass('error');
                this.$formObj.find('.ui.error.message').remove();
                this.$formObj.find('.prompt').remove();
                // Update validation rules
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
     * Initialize network filter dropdown with simplified logic
     */
    initializeNetworkFilterDropdown() {
        if (this.$networkFilterId.length === 0) return;
        
        // Get current value from data attribute (set by populateFormData) or form value or default
        const currentValue = this.$networkFilterId.data('value') || this.$networkFilterId.val() || ProviderBase.DEFAULTS.NETWORK_FILTER;
        
        // Initialize with NetworkFiltersAPI using simplified approach
        NetworkFiltersAPI.initializeDropdown(this.$networkFilterId, {
            currentValue,
            providerType: this.providerType,
            onChange: () => Form.dataChanged()
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
        
        // Initialize password strength indicator
        this.initializePasswordStrengthIndicator();
        

        // Show/hide password toggle
        this.$showHidePassword.on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (this.$secret.attr('type') === 'password') {
                // Show password
                $icon.removeClass('eye').addClass('eye slash');
                this.$secret.attr('type', 'text');
            } else {
                // Hide password
                $icon.removeClass('eye slash').addClass('eye');
                this.$secret.attr('type', 'password');
            }
        });

        // Generate new password
        this.$generatePassword.on('click', (e) => {
            e.preventDefault();
            this.generatePassword();
        });
    }

    /**
     * Initialize clipboard functionality
     */
    initializeClipboard() {
        const clipboard = new ClipboardJS(ProviderBase.SELECTORS.CLIPBOARD);
        this.$clipboard.popup({
            on: 'manual',
        });

        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        clipboard.on('error', (e) => {
            UserMessage.showError(globalTranslate.pr_ErrorOnProviderSave);
        });
    }

    /**
     * Generate a new password
     */
    generatePassword() {
        PbxApi.PasswordGenerate(ProviderBase.DEFAULTS.PASSWORD_LENGTH, (password) => {
            if (password) {
                this.$secret.val(password);
                this.$secret.trigger('change');
                Form.dataChanged();
                this.$clipboard.attr('data-clipboard-text', password);
                
                // Update password strength indicator
                const $passwordProgress = $('#password-strength-progress');
                if ($passwordProgress.length > 0 && typeof PasswordScore !== 'undefined') {
                    PasswordScore.checkPassStrength({
                        pass: password,
                        bar: $passwordProgress,
                        section: $passwordProgress
                    });
                }
            }
        });
    }
    
    /**
     * Initialize password strength indicator
     */
    initializePasswordStrengthIndicator() {
        // Password strength indicator
        if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
            // Create progress bar for password strength if it doesn't exist
            let $passwordProgress = $('#password-strength-progress');
            if ($passwordProgress.length === 0) {
                const $secretField = this.$secret.closest('.field');
                $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
                $secretField.append($passwordProgress);
            }
            
            // Initialize Semantic UI progress component
            $passwordProgress.progress({
                percent: 0,
                showActivity: false
            });
            
            // Update password strength on input
            this.$secret.on('input', () => {
                PasswordScore.checkPassStrength({
                    pass: this.$secret.val(),
                    bar: $passwordProgress,
                    section: $passwordProgress
                });
            });
        }
    }

    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */
    updateVisibilityElements() {
        // Override in child classes
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
        
        // Store network filter value for later initialization
        const networkFilterValue = data.networkfilterid || ProviderBase.DEFAULTS.NETWORK_FILTER;
        
        // Common provider fields
        $('#username').val(data.username || '');
        this.$secret.val(data.secret || '');
        $('#host').val(data.host || '');
        $('#registration_type').val(data.registration_type || ProviderBase.DEFAULTS.REGISTRATION_TYPE);
        // Store value in data attribute since select is empty and can't hold value
        this.$networkFilterId.data('value', networkFilterValue);
        $('#manualattributes').val(data.manualattributes || '');
        
        // Set default ports based on provider type
        if (this.providerType === 'SIP') {
            $('#port').val(data.port || ProviderBase.DEFAULTS.SIP_PORT);
        } else if (this.providerType === 'IAX') {
            $('#port').val(data.port || ProviderBase.DEFAULTS.IAX_PORT);
        }
        
        // Common checkboxes - handle both string '1' and boolean true
        if (data.qualify === '1' || data.qualify === true) $('#qualify').prop('checked', true);
        if (data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true) $('#receive_calls_without_auth').prop('checked', true);
        if (data.noregister === '1' || data.noregister === true) $('#noregister').prop('checked', true);
        
        // Disabled state
        if (data.disabled === '1' || data.disabled === true) {
            $('#disabled').val('1');
        }
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