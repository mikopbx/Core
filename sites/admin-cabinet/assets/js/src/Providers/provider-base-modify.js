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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, i18n, ProvidersAPI */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
class ProviderBase { 
    /**  
     * Constructor
     * @param {string} providerType - Type of provider (SIP or IAX)
     */
    constructor(providerType) {
        this.providerType = providerType;
        this.$formObj = $('#save-provider-form');
        this.$secret = $('#secret');
        this.$additionalHostsDummy = $('#additional-hosts-table .dummy');
        this.$checkBoxes = $('#save-provider-form .checkbox');
        this.$accordions = $('#save-provider-form .ui.accordion');
        this.$dropDowns = $('#save-provider-form .ui.dropdown');
        this.$deleteRowButton = $('#additional-hosts-table .delete-row-button');
        this.$additionalHostInput = $('#additional-host input');
        this.hostRow = '#save-provider-form .host-row';
        
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
        // Get provider ID and type from form
        const providerId = $('#id').val() || $('#uniqid').val() || '';
        const providerType = this.providerType;
        
        // Show loading state
        this.showLoadingState();
        
        // Load provider data from REST API
        ProvidersAPI.getRecord(providerId, providerType, (response) => {
            this.hideLoadingState();
            
            if (response.result && response.data) {
                // Populate form with data
                this.populateFormData(response.data);
            } else {
                // Provider data loading failed for existing provider
                if (providerId && providerId !== 'new') {
                    UserMessage.showMultiString(response.messages);
                }
            }
            
            // Continue with initialization
            this.initializeUIComponents();
            this.initializeEventHandlers();
            this.initializeForm();
            this.updateVisibilityElements();
            
            // Initialize all tooltip popups
            $('.popuped').popup();
            
            this.initializeClipboard();
            
            // Prevent browser password manager for generated passwords
            this.$secret.on('focus', function() {
                $(this).attr('autocomplete', 'new-password');
            });
        });
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        this.$checkBoxes.checkbox();
        this.$dropDowns.dropdown();
        this.$accordions.accordion();
        this.updateHostsTableView();
        
        // Initialize dynamic dropdowns
        this.initializeRegistrationTypeDropdown();
        if (this.providerType === 'SIP') {
            this.initializeDtmfModeDropdown();
            this.initializeTransportDropdown();
        }
        
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
        
        const currentValue = $field.val() || 'outbound';
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
     * Initialize DTMF mode dropdown for SIP providers
     */
    initializeDtmfModeDropdown() {
        const $field = $('#dtmfmode');
        if ($field.length === 0) return;
        
        // Check if already inside a dropdown structure
        const $existingDropdown = $field.closest('.ui.dropdown');
        if ($existingDropdown.length > 0) {
            // Already a dropdown, just ensure it's initialized
            if (!$existingDropdown.hasClass('dtmf-mode-dropdown')) {
                $existingDropdown.addClass('dtmf-mode-dropdown');
            }
            $existingDropdown.dropdown({
                onChange: () => Form.dataChanged()
            });
            return;
        }
        
        const currentValue = $field.val() || 'auto';
        
        const options = [
            { value: 'auto', text: globalTranslate.auto || 'auto' },
            { value: 'rfc4733', text: globalTranslate.rfc4733 || 'rfc4733' },
            { value: 'info', text: globalTranslate.info || 'info' },
            { value: 'inband', text: globalTranslate.inband || 'inband' },
            { value: 'auto_info', text: globalTranslate.auto_info || 'auto_info' }
        ];
        
        const dropdownHtml = `
            <div class="ui selection dropdown dtmf-mode-dropdown">
                <input type="hidden" name="dtmfmode" id="dtmfmode" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${options.find(o => o.value === currentValue)?.text || currentValue}</div>
                <div class="menu">
                    ${options.map(opt => `<div class="item" data-value="${opt.value}">${opt.text}</div>`).join('')}
                </div>
            </div>
        `;
        
        $field.replaceWith(dropdownHtml);
        
        $('.dtmf-mode-dropdown').dropdown({
            onChange: () => Form.dataChanged()
        });
    }
    
    /**
     * Initialize transport protocol dropdown for SIP providers
     */
    initializeTransportDropdown() {
        const $field = $('#transport');
        if ($field.length === 0) return;
        
        // Check if already inside a dropdown structure
        const $existingDropdown = $field.closest('.ui.dropdown');
        if ($existingDropdown.length > 0) {
            // Already a dropdown, just ensure it's initialized
            if (!$existingDropdown.hasClass('transport-dropdown')) {
                $existingDropdown.addClass('transport-dropdown');
            }
            $existingDropdown.dropdown({
                onChange: () => Form.dataChanged()
            });
            return;
        }
        
        const currentValue = $field.val() || 'UDP';
        
        const options = [
            { value: 'UDP', text: 'UDP' },
            { value: 'TCP', text: 'TCP' },
            { value: 'TLS', text: 'TLS' }
        ];
        
        const dropdownHtml = `
            <div class="ui selection dropdown transport-dropdown">
                <input type="hidden" name="transport" id="transport" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${currentValue}</div>
                <div class="menu">
                    ${options.map(opt => `<div class="item" data-value="${opt.value}">${opt.text}</div>`).join('')}
                </div>
            </div>
        `;
        
        $field.replaceWith(dropdownHtml);
        
        $('.transport-dropdown').dropdown({
            onChange: () => Form.dataChanged()
        });
    }
    
    /**
     * Initialize network filter dropdown
     */
    initializeNetworkFilterDropdown() {
        const $field = $('#networkfilterid');
        if ($field.length === 0) return;
        
        // Get the dropdown element
        let $dropdown = $field;
        if ($field.is('select')) {
            $dropdown = $field.hasClass('ui') ? $field : $field.closest('.ui.dropdown');
            if ($dropdown.length === 0) {
                $dropdown = $field;
            }
        }
        
        // Get current value
        const currentValue = this.getCurrentNetworkFilterValue();
        
        // Use NetworkFiltersAPI to initialize the dropdown
        NetworkFiltersAPI.initializeDropdown($dropdown, {
            currentValue: currentValue,
            providerType: this.providerType,
            onChange: (value) => {
                this.onNetworkFilterChange(value);
                Form.dataChanged();
            }
        });
    }
    
    /**
     * Get current network filter value from various sources
     * @returns {string} Current network filter value
     */
    getCurrentNetworkFilterValue() {
        // Try to get value from hidden input
        let value = $('#networkfilterid').val();
        
        // If not found, try to get from form data or REST API
        if (!value) {
            // Check if we're editing existing provider
            const providerId = $('#id').val();
            if (providerId) {
                // Value should be loaded from server when editing
                value = $('#networkfilterid').attr('value') || 'none';
            } else {
                // Default for new providers
                value = 'none';
            }
        }
        
        return value;
    }
    
    /**
     * Handle network filter change
     * @param {string} value - Selected network filter value
     */
    onNetworkFilterChange(value) {
        // Update hidden input value
        $('#networkfilterid').val(value);
        
        // Can be overridden in child classes for specific behavior
    }
    
    /**
     * Save current network filter value to restore later
     */
    saveNetworkFilterState() {
        const value = $('#networkfilterid').val();
        if (value) {
            sessionStorage.setItem(`${this.providerType}_networkfilter_value`, value);
        }
    }
    
    /**
     * Restore previously saved network filter value
     */
    restoreNetworkFilterState() {
        const savedValue = sessionStorage.getItem(`${this.providerType}_networkfilter_value`);
        if (savedValue) {
            const $dropdown = $('#networkfilterid').closest('.ui.dropdown');
            if ($dropdown.length > 0) {
                $dropdown.dropdown('set selected', savedValue);
            }
        }
    }

    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        const self = this;
        
        // Add new string to additional-hosts-table table
        this.$additionalHostInput.keypress((e) => {
            if (e.which === 13) {
                self.cbOnCompleteHostAddress();
            }
        });

        // Delete host from additional-hosts-table
        this.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            self.updateHostsTableView();
            Form.dataChanged();
            return false;
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
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
        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            this.generatePassword();
        });
    }

    /**
     * Initialize clipboard functionality
     */
    initializeClipboard() {
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
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
        PbxApi.PasswordGenerate(16, (password) => {
            if (password) {
                this.$secret.val(password);
                this.$secret.trigger('change');
                Form.dataChanged();
                $('.clipboard').attr('data-clipboard-text', password);
            }
        });
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
        $('.password-tooltip-icon').show();
    }
    
    /**
     * Hide password tooltip icon
     */
    hidePasswordTooltip() {
        $('.password-tooltip-icon').hide();
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
     */
    initializeForm() {
        Form.$formObj = this.$formObj;
        Form.url = `${globalRootUrl}providers/save`;
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
        result.data = this.$formObj.form('get values');
        
        // Convert additional hosts table to array
        const additionalHosts = [];
        $('#additional-hosts-table tbody tr:not(.dummy)').each((index, obj) => {
            const host = $(obj).find('td:first').text().trim();
            if (host) {
                additionalHosts.push(host);
            }
        });
        
        if (additionalHosts.length > 0) {
            result.data.additionalHosts = JSON.stringify(additionalHosts);
        }
        
        // Save current network filter state
        this.saveNetworkFilterState();
        
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
     * Handle completion of host address input
     */
    cbOnCompleteHostAddress() {
        const host = this.$additionalHostInput.val().trim();
        
        // Validate the host
        if (!host || !this.hostInputValidation.test(host)) {
            this.$additionalHostInput.parent().addClass('error');
            return;
        }
        
        // Check for duplicates
        let duplicate = false;
        $('#additional-hosts-table tbody tr:not(.dummy)').each((index, obj) => {
            if ($(obj).find('td:first').text().trim() === host) {
                duplicate = true;
                return false;
            }
        });
        
        if (duplicate) {
            this.$additionalHostInput.parent().addClass('error');
            return;
        }
        
        // Add new row
        const $newRow = this.$additionalHostsDummy.clone();
        $newRow.removeClass('dummy');
        $newRow.find('td:first').text(host);
        $newRow.find('.delete-row-button').on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            this.updateHostsTableView();
            Form.dataChanged();
            return false;
        });
        
        this.$additionalHostsDummy.before($newRow);
        this.$additionalHostInput.val('');
        this.$additionalHostInput.parent().removeClass('error');
        this.updateHostsTableView();
        Form.dataChanged();
    }

    /**
     * Update the visibility of hosts table
     */
    updateHostsTableView() {
        const hasHosts = $('#additional-hosts-table tbody tr:not(.dummy)').length > 0;
        if (hasHosts) {
            $('#additional-hosts-table').show();
        } else {
            $('#additional-hosts-table').hide();
        }
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
        if (data.id) $('#id').val(data.id);
        if (data.uniqid) $('#uniqid').val(data.uniqid);
        if (data.description) $('#description').val(data.description);
        if (data.note) $('#note').val(data.note);
        
        // Provider type specific fields
        if (this.providerType === 'SIP' && data.Sip) {
            const sipData = data.Sip;
            $('#username').val(sipData.username || '');
            $('#secret').val(sipData.secret || '');
            $('#host').val(sipData.host || '');
            $('#port').val(sipData.port || '5060');
            $('#registration_type').val(sipData.registration_type || 'outbound');
            $('#networkfilterid').val(sipData.networkfilterid || 'none');
            $('#dtmfmode').val(sipData.dtmfmode || 'auto');
            $('#transport').val(sipData.transport || 'UDP');
            $('#fromuser').val(sipData.fromuser || '');
            $('#fromdomain').val(sipData.fromdomain || '');
            $('#outbound_proxy').val(sipData.outbound_proxy || '');
            $('#manualattributes').val(sipData.manualattributes || '');
            
            // Checkboxes
            if (sipData.qualify === '1') $('#qualify').prop('checked', true);
            if (sipData.disablefromuser === '1') $('#disablefromuser').prop('checked', true);
            if (sipData.receive_calls_without_auth === '1') $('#receive_calls_without_auth').prop('checked', true);
            if (sipData.noregister === '1') $('#noregister').prop('checked', true);
            
            // Qualify frequency
            $('#qualifyfreq').val(sipData.qualifyfreq || '60');
            
            // Additional hosts
            if (data.additionalHosts && Array.isArray(data.additionalHosts)) {
                data.additionalHosts.forEach((host) => {
                    this.$additionalHostInput.val(host);
                    this.cbOnCompleteHostAddress();
                });
            }
        } else if (this.providerType === 'IAX' && data.Iax) {
            const iaxData = data.Iax;
            $('#username').val(iaxData.username || '');
            $('#secret').val(iaxData.secret || '');
            $('#host').val(iaxData.host || '');
            $('#port').val(iaxData.port || '4569');
            $('#registration_type').val(iaxData.registration_type || 'outbound');
            $('#networkfilterid').val(iaxData.networkfilterid || 'none');
            $('#manualattributes').val(iaxData.manualattributes || '');
            
            // Checkboxes
            if (iaxData.qualify === '1') $('#qualify').prop('checked', true);
            if (iaxData.receive_calls_without_auth === '1') $('#receive_calls_without_auth').prop('checked', true);
            if (iaxData.noregister === '1') $('#noregister').prop('checked', true);
        }
        
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
}