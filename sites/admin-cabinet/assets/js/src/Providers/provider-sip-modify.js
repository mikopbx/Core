/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderSipTooltipManager, ProviderTooltipManager, i18n, SipProvidersAPI */

/**
 * Custom validation rule: Check if regex pattern is valid
 * Only validates when the corresponding source dropdown is set to 'custom'
 */
$.fn.form.settings.rules.regexPattern = (value, parameter) => {
    // Parse parameter to get field type (cid or did)
    const fieldType = parameter || 'cid';
    const sourceField = fieldType === 'did' ? '#did_source' : '#cid_source';

    // Skip validation if source is not 'custom'
    if ($(sourceField).val() !== 'custom') {
        return true;
    }

    // Allow empty values (field is optional)
    if (!value || value.trim() === '') {
        return true;
    }

    // Validate regex pattern
    try {
        new RegExp(value);
        return true;
    } catch (e) {
        console.log(`Invalid ${fieldType.toUpperCase()} regex pattern:`, value, e.message);
        return false;
    }
};

/**
 * Custom validation rule: Check if custom header is valid
 * Only validates when the corresponding source dropdown is set to 'custom'
 */
$.fn.form.settings.rules.customHeader = (value, parameter) => {
    // Parse parameter to get field type (cid or did)
    const fieldType = parameter || 'cid';
    const sourceField = fieldType === 'did' ? '#did_source' : '#cid_source';

    // Skip validation if source is not 'custom'
    if ($(sourceField).val() !== 'custom') {
        return true;
    }

    // Field is required when source is custom
    if (!value || value.trim() === '') {
        return false;
    }

    // Validate format: only letters, numbers, dash and underscore
    return /^[A-Za-z0-9-_]+$/.test(value);
};

/**
 * SIP provider management form
 * @class ProviderSIP
 */
class ProviderSIP extends ProviderBase {  
    // SIP-specific selectors
    static SIP_SELECTORS = {
        ADDITIONAL_HOSTS_TABLE: '#additional-hosts-table',
        ADDITIONAL_HOSTS_DUMMY: '#additional-hosts-table .dummy',
        ADDITIONAL_HOSTS_TEMPLATE: '#additional-hosts-table .host-row-tpl',
        ADDITIONAL_HOST_INPUT: '#additional-host input',
        DELETE_ROW_BUTTON: '.delete-row-button',
        HOST_ROW: '.host-row'
    };
    
    constructor() {
        super('SIP');
        this.$qualifyToggle = $('#qualify');
        this.$qualifyFreqToggle = $('#qualify-freq');
        
        // SIP-specific jQuery objects
        this.$additionalHostsDummy = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_DUMMY);
        this.$additionalHostsTemplate = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_TEMPLATE);
        this.$additionalHostsTable = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_TABLE);
        this.$additionalHostInput = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOST_INPUT);
    }

    /**
     * Initialize the provider form
     * Override to add SIP-specific initialization
     */
    initialize() {
        // Call parent initialize - this handles the full flow:
        // 1. initializeUIComponents()
        // 2. initializeEventHandlers()
        // 3. initializeForm()
        // 4. loadFormData()
        super.initialize();
    }

    /**
     * Override initializeUIComponents to add SIP-specific UI initialization
     */
    initializeUIComponents() {
        // Call parent first
        super.initializeUIComponents();

        // SIP-specific UI components
        this.$qualifyToggle.checkbox({
            onChange: () => {
                if (this.$qualifyToggle.checkbox('is checked')) {
                    this.$qualifyFreqToggle.removeClass('disabled');
                } else {
                    this.$qualifyFreqToggle.addClass('disabled');
                }
            },
        });

        // Initialize debug checkbox - using parent container with class selector
        $('#cid_did_debug').parent('.checkbox').checkbox();

        // Initialize SIP-specific static dropdowns (PHP-rendered)
        this.initializeDtmfModeDropdown();
        this.initializeTransportDropdown();
        this.initializeCallerIdSourceDropdown();
        this.initializeDidSourceDropdown();

        // Initialize tabs
        this.initializeTabs();
    }

    /**
     * Override initializeEventHandlers to add SIP-specific handlers
     */
    initializeEventHandlers() {
        // Call parent first
        super.initializeEventHandlers();

        // SIP-specific event handlers
        $('input[name="disablefromuser"]').on('change', () => {
            this.updateVisibilityElements();
            Form.dataChanged();
        });

        // Initialize SIP-specific components
        this.initializeSipEventHandlers();
        this.updateHostsTableView();

        // Initialize field help tooltips
        ProviderSipTooltipManager.initialize();
    }
    
    /**
     * Initialize tab functionality
     */
    initializeTabs() {
        const self = this;
        
        // Disable diagnostics tab for new providers
        if (this.isNewProvider) {
            $('#provider-tabs-menu .item[data-tab="diagnostics"]')
                .addClass('disabled')
                .css('opacity', '0.45')
                .css('cursor', 'not-allowed');
        } else {
            $('#provider-tabs-menu .item[data-tab="diagnostics"]')
                .removeClass('disabled')
                .css('opacity', '')
                .css('cursor', '');
        }
        
        $('#provider-tabs-menu .item').tab({
            onVisible: (tabPath) => {
                if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined' && !self.isNewProvider) {
                    // Initialize diagnostics tab when it becomes visible
                    providerModifyStatusWorker.initializeDiagnosticsTab();
                }
            },
            onLoad: (tabPath, parameterArray, historyEvent) => {
                // Block loading of diagnostics tab for new providers
                if (tabPath === 'diagnostics' && self.isNewProvider) {
                    // Switch back to settings tab
                    $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
                    return false;
                }
            }
        });
        
        // Additional click prevention for disabled tab
        $('#provider-tabs-menu .item[data-tab="diagnostics"]').off('click.disabled').on('click.disabled', function(e) {
            if (self.isNewProvider) {
                e.preventDefault();
                e.stopImmediatePropagation();
                // Ensure we stay on settings tab
                $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
                return false;
            }
        });
    }
    
    /**
     * Initialize SIP-specific event handlers
     */
    initializeSipEventHandlers() {
        const self = this;
        
        // Add new string to additional-hosts-table table
        this.$additionalHostInput.keypress((e) => {
            if (e.which === 13) {
                self.cbOnCompleteHostAddress();
            }
        });

        // Delete host from additional-hosts-table - use event delegation for dynamic elements
        this.$additionalHostsTable.on('click', ProviderSIP.SIP_SELECTORS.DELETE_ROW_BUTTON, (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            self.updateHostsTableView();
            Form.dataChanged();
            return false;
        });
    }
    
    /**
     * Initialize DTMF mode dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeDtmfModeDropdown() {
        const $dropdown = $('#dtmfmode-dropdown');
        if ($dropdown.length === 0) return;
        
        // Initialize with standard Fomantic UI - it's already rendered by PHP
        $dropdown.dropdown({
            onChange: () => Form.dataChanged()
        });
    }
    
    /**
     * Initialize transport protocol dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeTransportDropdown() {
        const $dropdown = $('#transport-dropdown');
        if ($dropdown.length === 0) return;
        
        // Initialize with standard Fomantic UI - it's already rendered by PHP
        $dropdown.dropdown({
            onChange: () => Form.dataChanged()
        });
    }
    
    /**
     * Initialize CallerID source dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeCallerIdSourceDropdown() {
        const $dropdown = $('#cid_source-dropdown');
        if ($dropdown.length === 0) return;
        
        // Initialize with standard Fomantic UI - it's already rendered by PHP
        $dropdown.dropdown({
            onChange: (value) => {
                this.onCallerIdSourceChange(value);
                Form.dataChanged();
            }
        });
    }
    
    /**
     * Initialize DID source dropdown with standard Fomantic UI (PHP-rendered)
     */
    initializeDidSourceDropdown() {
        const $dropdown = $('#did_source-dropdown');
        if ($dropdown.length === 0) return;
        
        // Initialize with standard Fomantic UI - it's already rendered by PHP
        $dropdown.dropdown({
            onChange: (value) => {
                this.onDidSourceChange(value);
                Form.dataChanged();
            }
        });
    }
    
    /**
     * Handle CallerID source change
     * @param {string} value - Selected CallerID source
     */
    onCallerIdSourceChange(value) {
        const $customSettings = $('#callerid-custom-settings');
        if (value === 'custom') {
            // Make custom header field required
            $('#cid_custom_header').closest('.field').addClass('required');
            // Show custom settings using Fomantic UI transition
            $customSettings.transition('fade down');
        } else {
            // Hide custom settings using Fomantic UI transition
            $customSettings.transition('hide');
            // Remove required status
            $('#cid_custom_header').closest('.field').removeClass('required');
            // Clear custom fields when not in use
            $('#cid_custom_header').val('');
            $('#cid_parser_start').val('');
            $('#cid_parser_end').val('');
            $('#cid_parser_regex').val('');
            // Clear any validation errors on hidden fields
            $('#cid_parser_regex').closest('.field').removeClass('error');
        }
        // No need to reinitialize form - validation rules check source automatically
    }
    
    /**
     * Handle DID source change
     * @param {string} value - Selected DID source
     */
    onDidSourceChange(value) {
        const $customSettings = $('#did-custom-settings');
        if (value === 'custom') {
            // Make custom header field required
            $('#did_custom_header').closest('.field').addClass('required');
            // Show custom settings using Fomantic UI transition
            $customSettings.transition('fade down');
        } else {
            // Hide custom settings using Fomantic UI transition
            $customSettings.transition('hide');
            // Remove required status
            $('#did_custom_header').closest('.field').removeClass('required');
            // Clear custom fields when not in use
            $('#did_custom_header').val('');
            $('#did_parser_start').val('');
            $('#did_parser_end').val('');
            $('#did_parser_regex').val('');
            // Clear any validation errors on hidden fields
            $('#did_parser_regex').closest('.field').removeClass('error');
        }
        // No need to reinitialize form - validation rules check source automatically
    }
    /**
     * Initialize form with REST API configuration
     */
    initializeForm() {
        Form.$formObj = this.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = this.getValidateRules();
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        
        // Configure REST API settings for v3
        Form.apiSettings = {
            enabled: true,
            apiObject: SipProvidersAPI, // Use SIP-specific API client v3
            saveMethod: 'saveRecord'
        };
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}providers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}providers/modifysip/`;
        
        // Enable automatic checkbox to boolean conversion
        Form.convertCheckboxesToBool = true;
        
        // Initialize the form - this was missing!
        Form.initialize();
        
        // Mark form as fully initialized
        this.formInitialized = true;
    }
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        // IMPORTANT: Don't overwrite result.data - it already contains processed checkbox values
        // Just add/modify specific fields
        
        // Add provider type
        result.data.type = this.providerType;
        
        // Handle additional hosts for SIP - collect from table
        const additionalHosts = [];
        $('#additional-hosts-table tbody tr.host-row').each((index, element) => {
            const host = $(element).find('td.address').text().trim();
            if (host) {
                additionalHosts.push({ address: host });
            }
        });
        
        // Only add if there are hosts
        if (additionalHosts.length > 0) {
            result.data.additionalHosts = additionalHosts;
        }
        
        return result;
    }
    
    /**
     * Override initializeDropdownsWithData to set SIP-specific dropdown values
     * Called from parent's populateForm() in beforePopulate callback
     * @param {object} data - Provider data from API
     */
    initializeDropdownsWithData(data = {}) {
        // Call parent first (initializes common dropdowns like networkfilterid)
        super.initializeDropdownsWithData(data);

        // SIP-specific dropdowns are already initialized in initializeUIComponents
        // Just set their values from API data
        const dropdownUpdates = [
            { selector: '#dtmfmode-dropdown', value: data.dtmfmode || '' },
            { selector: '#transport-dropdown', value: data.transport || '' },
            { selector: '#registration_type-dropdown', value: data.registration_type || '' },
            { selector: '#cid_source-dropdown', value: data.cid_source || '' },
            { selector: '#did_source-dropdown', value: data.did_source || '' }
        ];

        dropdownUpdates.forEach(({ selector, value }) => {
            const $dropdown = $(selector);
            if ($dropdown.length > 0) {
                $dropdown.dropdown('set selected', value);
            }
        });
    }

    /**
     * Override populateFormData to handle SIP-specific fields
     * Called from parent's populateForm() in afterPopulate callback
     * Most fields are handled by Form.populateFormSilently()
     * @param {object} data - Provider data from API
     */
    populateFormData(data) {
        // Call parent method first
        super.populateFormData(data);

        // Additional hosts - populate after form is ready
        if (data.additionalHosts) {
            this.populateAdditionalHosts(data.additionalHosts);
        }
    }
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        super.cbAfterSendForm(response);
        
        if (response.result && response.data) {
            // Update form with response data if needed
            if (response.data.id && !$('#id').val()) {
                $('#id').val(response.data.id);
            }
            
            // The Form.js will handle the reload automatically if response.reload is present
            // For new records, REST API returns reload path like "providers/modifysip/SIP-TRUNK-xxx"
        }
    }
    

    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */
    getValidateRules() {
        const regType = $('#registration_type').val();
        const rulesMap = {
            outbound: () => this.getOutboundRules(),
            inbound: () => this.getInboundRules(),
            none: () => this.getNoneRules(),
        };
        
        const rules = rulesMap[regType] ? rulesMap[regType]() : this.getOutboundRules();
        
        // Add CallerID/DID validation rules
        return this.addCallerIdDidRules(rules);
    }
    
    /**
     * Add CallerID/DID validation rules
     * @param {object} rules - Existing rules
     * @returns {object} Rules with CallerID/DID validation
     */
    addCallerIdDidRules(rules) {
        // Custom header validation using global custom rules
        rules.cid_custom_header = {
            identifier: 'cid_custom_header',
            optional: true,
            rules: [{
                type: 'customHeader[cid]',
                prompt: globalTranslate.pr_ValidateCustomHeaderEmpty,
            }]
        };

        rules.did_custom_header = {
            identifier: 'did_custom_header',
            optional: true,
            rules: [{
                type: 'customHeader[did]',
                prompt: globalTranslate.pr_ValidateCustomHeaderEmpty,
            }]
        };

        // Regex pattern validation using global custom rules
        rules.cid_parser_regex = {
            identifier: 'cid_parser_regex',
            optional: true,
            rules: [{
                type: 'regexPattern[cid]',
                prompt: globalTranslate.pr_ValidateInvalidRegex
            }]
        };

        rules.did_parser_regex = {
            identifier: 'did_parser_regex',
            optional: true,
            rules: [{
                type: 'regexPattern[did]',
                prompt: globalTranslate.pr_ValidateInvalidRegex
            }]
        };

        // Parser start/end fields don't need validation - they are truly optional
        // No rules needed for cid_parser_start, cid_parser_end, did_parser_start, did_parser_end

        return rules;
    }

    /**
     * Get validation rules for outbound registration
     */
    getOutboundRules() {
        return {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            host: {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9.-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters,
                    },
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '^[a-zA-Z0-9_.-]+$',
                        prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters,
                    },
                ],
            },
            secret: {
                identifier: 'secret',
                optional: true,
                rules: [],
            },
            port: {
                identifier: 'port',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                    },
                    {
                        type: 'integer[1..65535]',
                        prompt: globalTranslate.pr_ValidationProviderPortInvalid,
                    },
                ],
            },
            additional_hosts: {
                identifier: 'additional-host',
                optional: true,
                rules: [
                    {
                        type: 'regExp',
                        value: this.hostInputValidation,
                        prompt: globalTranslate.pr_ValidationAdditionalHostInvalid,
                    },
                ],
            },
        };
    }

    /**
     * Get validation rules for inbound registration
     */
    getInboundRules() {
        return {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '^[a-zA-Z0-9_.-]+$',
                        prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters,
                    },
                ],
            },
            secret: {
                identifier: 'secret',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                    },
                    {
                        type: 'minLength[8]',
                        prompt: globalTranslate.pr_ValidationProviderPasswordTooShort,
                    },
                ],
            },
            additional_hosts: {
                identifier: 'additional-host',
                optional: true,
                rules: [
                    {
                        type: 'regExp',
                        value: this.hostInputValidation,
                        prompt: globalTranslate.pr_ValidationAdditionalHostInvalid,
                    },
                ],
            },
        };
    }

    /**
     * Get validation rules for none registration
     */
    getNoneRules() {
        return {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            host: {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9.-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters,
                    },
                ],
            },
            port: {
                identifier: 'port',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                    },
                    {
                        type: 'integer[1..65535]',
                        prompt: globalTranslate.pr_ValidationProviderPortInvalid,
                    },
                ],
            },
            additional_hosts: {
                identifier: 'additional-host',
                optional: true,
                rules: [
                    {
                        type: 'regExp',
                        value: this.hostInputValidation,
                        prompt: globalTranslate.pr_ValidationAdditionalHostInvalid,
                    },
                ],
            },
        };
    }

    /**
     * Update host label based on registration type
     */
    updateHostLabel(regType) {
        const $hostLabelText = $('#hostLabelText');
        
        if (regType === 'outbound') {
            $hostLabelText.text(globalTranslate.pr_ProviderHostOrIPAddress);
        } else if (regType === 'none') {
            $hostLabelText.text(globalTranslate.pr_RemoteHostOrIPAddress);
        }
        // For inbound, the field is hidden so no need to update label
    }
    
    /**
     * Update the visibility of elements based on the registration type
     */
    updateVisibilityElements() {
        const regType = $('#registration_type').val();
        const providerId = $('#id').val();
        
        // Cache DOM elements
        const elements = {
            host: $('#elHost'),
            port: $('#elPort'),
            username: $('#elUsername'),
            secret: $('#elSecret'),
            additionalHost: $('#elAdditionalHosts'),
            networkFilter: $('#elNetworkFilter')
        };
        
        const fields = {
            username: $('#username'),
            secret: this.$secret,
            networkFilterId: $('#networkfilterid')
        };
        
        // Configuration for each registration type
        const configs = {
            outbound: {
                visible: ['host', 'port', 'username', 'secret', 'additionalHost'],
                hidden: ['networkFilter'],
                passwordWidget: {
                    generateButton: false,
                    showPasswordButton: false,
                    clipboardButton: false,
                    showStrengthBar: false,
                    validation: PasswordWidget.VALIDATION.NONE
                },
                resetNetworkFilter: true
            },
            inbound: {
                visible: ['username', 'secret', 'networkFilter', 'additionalHost'],
                hidden: ['host', 'port'],
                passwordWidget: {
                    generateButton: true,
                    showPasswordButton: true,
                    clipboardButton: true,
                    showStrengthBar: true,
                    validation: PasswordWidget.VALIDATION.SOFT
                },
                readonlyUsername: true,
                autoGeneratePassword: true,
                clearValidationFor: ['host', 'port']
            },
            none: {
                visible: ['host', 'port', 'username', 'secret', 'additionalHost', 'networkFilter'],
                hidden: [],
                passwordWidget: {
                    generateButton: true,
                    showPasswordButton: true,
                    clipboardButton: true,
                    showStrengthBar: true,
                    validation: PasswordWidget.VALIDATION.SOFT
                },
                showPasswordTooltip: true,
                makeOptional: ['secret'],
                clearValidationFor: ['username', 'secret']
            }
        };
        
        // Get current configuration
        const config = configs[regType] || configs.outbound;
        
        // Apply visibility
        config.visible.forEach(key => elements[key]?.show());
        config.hidden.forEach(key => elements[key]?.hide());
        
        // Handle username field
        if (config.readonlyUsername) {
            // For inbound registration, username should match provider ID
            // Backend always returns ID (temporary for new providers like SIP-NEW-XXXXXXXX)
            fields.username.val(providerId).attr('readonly', '');
        } else {
            // Reset username if it matches provider ID when not inbound
            if (fields.username.val() === providerId && regType !== 'inbound') {
                fields.username.val('');
            }
            fields.username.removeAttr('readonly');
        }
        
        // Auto-generate password for inbound if empty
        if (config.autoGeneratePassword && fields.secret.val().trim() === '' && this.passwordWidget) {
            this.passwordWidget.elements.$generateBtn?.trigger('click');
        }
        
        // Reset network filter for outbound
        if (config.resetNetworkFilter) {
            fields.networkFilterId.val('none');
        }
        
        // Update password widget configuration
        if (this.passwordWidget && config.passwordWidget) {
            PasswordWidget.updateConfig(this.passwordWidget, config.passwordWidget);
        }
        
        // Handle password tooltip
        if (config.showPasswordTooltip) {
            this.showPasswordTooltip();
        } else {
            this.hidePasswordTooltip();
        }
        
        // Make fields optional
        config.makeOptional?.forEach(field => {
            $(`#el${field.charAt(0).toUpperCase() + field.slice(1)}`).removeClass('required');
        });
        
        // Clear validation errors for specified fields
        config.clearValidationFor?.forEach(field => {
            this.$formObj.form('remove prompt', field);
            $(`#${field}`).closest('.field').removeClass('error');
        });
        
        // Update host label
        this.updateHostLabel(regType); 

        // Update element visibility based on 'disablefromuser' checkbox
        // Use the outer div.checkbox container instead of input element
        const el = $('input[name="disablefromuser"]').closest('.ui.checkbox');
        const fromUser = $('#divFromUser');
        if (el.length > 0 && el.checkbox('is checked')) {
            fromUser.hide();
            fromUser.removeClass('visible');
        } else {
            fromUser.show();
            fromUser.addClass('visible');
        }
        
        
        // Update CallerID custom settings visibility based on current dropdown value
        const cidDropdown = $('#cid_source-dropdown');
        if (cidDropdown.length > 0) {
            const cidValue = cidDropdown.dropdown('get value');
            const cidCustomSettings = $('#callerid-custom-settings');
            if (cidValue === 'custom') {
                // Show using Fomantic UI transition
                cidCustomSettings.transition('show');
            } else {
                // Hide using Fomantic UI transition
                cidCustomSettings.transition('hide');
            }
        }
        
        // Update DID custom settings visibility based on current dropdown value
        const didDropdown = $('#did_source-dropdown');
        if (didDropdown.length > 0) {
            const didValue = didDropdown.dropdown('get value');
            const didCustomSettings = $('#did-custom-settings');
            if (didValue === 'custom') {
                // Show using Fomantic UI transition
                didCustomSettings.transition('show');
            } else {
                // Hide using Fomantic UI transition
                didCustomSettings.transition('hide');
            }
        }
    }
    
    /**
     * Handle completion of host address input
     */
    cbOnCompleteHostAddress() {
        const value = this.$formObj.form('get value', 'additional-host');
        
        if (value) {
            const validation = value.match(this.hostInputValidation);
            
            // Validate the input value
            if (validation === null || validation.length === 0) {
                this.$additionalHostInput.transition('shake');
                return;
            }
            
            // Check if the host address already exists
            if ($(`.host-row[data-value=\"${value}\"]`).length === 0) {
                const $tr = this.$additionalHostsTemplate.last();
                const $clone = $tr.clone(false); // Use false since events are delegated
                $clone
                    .removeClass('host-row-tpl')
                    .addClass('host-row')
                    .show();
                $clone.attr('data-value', value);
                $clone.find('.address').html(value);
                const $existingHostRows = this.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);
                if ($existingHostRows.last().length === 0) {
                    $tr.after($clone);
                } else {
                    $existingHostRows.last().after($clone);
                }
                this.updateHostsTableView();
                Form.dataChanged();
            }
            this.$additionalHostInput.val('');
        }
    }

    /**
     * Update the visibility of hosts table
     */
    updateHostsTableView() {
        const $hostRows = this.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);
        if ($hostRows.length === 0) {
            this.$additionalHostsDummy.show();
        } else {
            this.$additionalHostsDummy.hide();
        }
    }
    
    
    /**
     * Populate additional hosts from API data
     * @param {array} additionalHosts - Array of additional hosts from API
     */
    populateAdditionalHosts(additionalHosts) {
        if (!additionalHosts || !Array.isArray(additionalHosts)) {
            return;
        }
        
        // Clear existing hosts first (except template and dummy)
        this.$additionalHostsTable.find(`tbody tr${ProviderSIP.SIP_SELECTORS.HOST_ROW}`).remove();
        
        // Add each host using the same logic as cbOnCompleteHostAddress
        additionalHosts.forEach((hostObj) => {
            // Handle both object format {id, address} and string format
            const hostAddress = typeof hostObj === 'string' ? hostObj : hostObj.address;
            if (hostAddress && hostAddress.trim()) {
                // Use the same logic as cbOnCompleteHostAddress
                const $tr = this.$additionalHostsTemplate.last();
                const $clone = $tr.clone(false); // Use false since events are delegated
                $clone
                    .removeClass('host-row-tpl')
                    .addClass('host-row')
                    .show();
                $clone.attr('data-value', hostAddress);
                $clone.find('.address').html(hostAddress);
                
                // Insert the cloned row
                const $existingHostRows = this.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);
                if ($existingHostRows.last().length === 0) {
                    $tr.after($clone);
                } else {
                    $existingHostRows.last().after($clone);
                }
            }
        });
        
        // Update table visibility
        this.updateHostsTableView();
    }
}

/**
 * Initialize provider form on document ready
 */
$(document).ready(() => {
    const provider = new ProviderSIP();
    provider.initialize();
});