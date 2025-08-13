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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderSipTooltipManager, ProviderTooltipManager, i18n */

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
     */
    initialize() {
        super.initialize(); 
        
        // SIP-specific initialization
        this.$qualifyToggle.checkbox({
            onChange: () => {
                if (this.$qualifyToggle.checkbox('is checked')) {
                    this.$qualifyFreqToggle.removeClass('disabled');
                } else {
                    this.$qualifyFreqToggle.addClass('disabled');
                }
            },
        });

        $('input[name="disablefromuser"]').on('change', () => {
            this.updateVisibilityElements();
            Form.dataChanged();
        });
        
        // Initialize SIP-specific dropdowns
        this.initializeDtmfModeDropdown();
        this.initializeTransportDropdown();
        this.initializeCallerIdSourceDropdown();
        this.initializeDidSourceDropdown();
        
        // Initialize debug checkbox - using parent container with class selector
        $('#cid_did_debug').parent('.checkbox').checkbox();
        
        // Initialize field help tooltips
        ProviderSipTooltipManager.initialize();
        
        // Initialize tabs
        this.initializeTabs();
        
        // Initialize SIP-specific components
        this.initializeSipEventHandlers();
        this.updateHostsTableView();
    }
    
    /**
     * Initialize tab functionality
     */
    initializeTabs() {
        $('#provider-tabs-menu .item').tab({
            onVisible: (tabPath) => {
                if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined') {
                    // Initialize diagnostics tab when it becomes visible
                    providerModifyStatusWorker.initializeDiagnosticsTab();
                }
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
        
        const currentValue = $field.val() || ProviderBase.DEFAULTS.DTMF_MODE;
        
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
        
        const currentValue = $field.val() || ProviderBase.DEFAULTS.TRANSPORT;
        
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
     * Initialize CallerID source dropdown
     */
    initializeCallerIdSourceDropdown() {
        const $field = $('#cid_source');
        if ($field.length === 0) return;
        
        // Check if already inside a dropdown structure
        const $existingDropdown = $field.closest('.ui.dropdown');
        if ($existingDropdown.length > 0) {
            // Already a dropdown, just ensure it's initialized
            if (!$existingDropdown.hasClass('callerid-source-dropdown')) {
                $existingDropdown.addClass('callerid-source-dropdown');
            }
            $existingDropdown.dropdown({
                onChange: (value) => {
                    this.onCallerIdSourceChange(value);
                    Form.dataChanged();
                }
            });
            return;
        }
        
        const currentValue = $field.val() || 'default';
        
        const options = [
            { value: 'default', text: globalTranslate.pr_CallerIdSourceDefault || 'Default' },
            { value: 'from', text: globalTranslate.pr_CallerIdSourceFrom || 'FROM header' },
            { value: 'rpid', text: globalTranslate.pr_CallerIdSourceRpid || 'Remote-Party-ID' },
            { value: 'pai', text: globalTranslate.pr_CallerIdSourcePai || 'P-Asserted-Identity' },
            { value: 'custom', text: globalTranslate.pr_CallerIdSourceCustom || 'Custom header' }
        ];
        
        const dropdownHtml = `
            <div class="ui selection dropdown callerid-source-dropdown">
                <input type="hidden" name="cid_source" id="cid_source" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${options.find(o => o.value === currentValue)?.text || currentValue}</div>
                <div class="menu">
                    ${options.map(opt => `
                        <div class="item" data-value="${opt.value}">
                            <span>${opt.text}</span>
                            ${opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        $field.replaceWith(dropdownHtml);
        
        $('.callerid-source-dropdown').dropdown({
            onChange: (value) => {
                this.onCallerIdSourceChange(value);
                Form.dataChanged();
            }
        });
    }
    
    /**
     * Initialize DID source dropdown
     */
    initializeDidSourceDropdown() {
        const $field = $('#did_source');
        if ($field.length === 0) return;
        
        // Check if already inside a dropdown structure
        const $existingDropdown = $field.closest('.ui.dropdown');
        if ($existingDropdown.length > 0) {
            // Already a dropdown, just ensure it's initialized
            if (!$existingDropdown.hasClass('did-source-dropdown')) {
                $existingDropdown.addClass('did-source-dropdown');
            }
            $existingDropdown.dropdown({
                onChange: (value) => {
                    this.onDidSourceChange(value);
                    Form.dataChanged();
                }
            });
            return;
        }
        
        const currentValue = $field.val() || 'default';
        
        const options = [
            { value: 'default', text: globalTranslate.pr_DidSourceDefault || 'Default' },
            { value: 'to', text: globalTranslate.pr_DidSourceTo || 'TO header' },
            { value: 'diversion', text: globalTranslate.pr_DidSourceDiversion || 'Diversion header' },
            { value: 'custom', text: globalTranslate.pr_DidSourceCustom || 'Custom header' }
        ];
        
        const dropdownHtml = `
            <div class="ui selection dropdown did-source-dropdown">
                <input type="hidden" name="did_source" id="did_source" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${options.find(o => o.value === currentValue)?.text || currentValue}</div>
                <div class="menu">
                    ${options.map(opt => `
                        <div class="item" data-value="${opt.value}">
                            <span>${opt.text}</span>
                            ${opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        $field.replaceWith(dropdownHtml);
        
        $('.did-source-dropdown').dropdown({
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
        }
        // Update form validation
        Form.validateRules = this.getValidateRules();
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
        }
        // Update form validation
        Form.validateRules = this.getValidateRules();
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
        
        // Configure REST API settings
        Form.apiSettings = {
            enabled: true,
            apiObject: ProvidersAPI,
            saveMethod: 'saveRecord'
        };
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}providers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}providers/modifysip/`;
        
        // Enable automatic checkbox to boolean conversion
        Form.convertCheckboxesToBool = true;
        
        Form.initialize();
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
     * Override populateFormData to handle SIP-specific data
     * @param {object} data - Provider data from API
     */
    populateFormData(data) {
        // Call parent method first for common fields
        super.populateFormData(data);
        
        if (this.providerType === 'SIP') {
            // SIP-specific fields
            $('#dtmfmode').val(data.dtmfmode || ProviderBase.DEFAULTS.DTMF_MODE);
            $('#transport').val(data.transport || ProviderBase.DEFAULTS.TRANSPORT);
            $('#fromuser').val(data.fromuser || '');
            $('#fromdomain').val(data.fromdomain || '');
            $('#outbound_proxy').val(data.outbound_proxy || '');
            
            // SIP-specific checkboxes
            if (data.disablefromuser === '1' || data.disablefromuser === true) $('#disablefromuser').prop('checked', true);
            
            // Qualify frequency
            $('#qualifyfreq').val(data.qualifyfreq || ProviderBase.DEFAULTS.QUALIFY_FREQ);
            
            // CallerID/DID fields
            $('#cid_source').val(data.cid_source || 'default');
            $('#did_source').val(data.did_source || 'default');
            $('#cid_custom_header').val(data.cid_custom_header || '');
            $('#cid_parser_start').val(data.cid_parser_start || '');
            $('#cid_parser_end').val(data.cid_parser_end || '');
            $('#cid_parser_regex').val(data.cid_parser_regex || '');
            $('#did_custom_header').val(data.did_custom_header || '');
            $('#did_parser_start').val(data.did_parser_start || '');
            $('#did_parser_end').val(data.did_parser_end || '');
            $('#did_parser_regex').val(data.did_parser_regex || '');
            
            // Update cid_did_debug checkbox
            if (data.cid_did_debug === '1' || data.cid_did_debug === true) {
                $('#cid_did_debug').prop('checked', true);
            } else {
                $('#cid_did_debug').prop('checked', false);
            }
            
            // Update dropdown values after setting hidden inputs
            const dropdownUpdates = [
                { selector: '.dtmf-mode-dropdown', value: data.dtmfmode || ProviderBase.DEFAULTS.DTMF_MODE },
                { selector: '.transport-dropdown', value: data.transport || ProviderBase.DEFAULTS.TRANSPORT },
                { selector: '.registration-type-dropdown', value: data.registration_type || ProviderBase.DEFAULTS.REGISTRATION_TYPE },
                { selector: '.callerid-source-dropdown', value: data.cid_source || 'default' },
                { selector: '.did-source-dropdown', value: data.did_source || 'default' }
            ];
            
            dropdownUpdates.forEach(({ selector, value }) => {
                const $dropdown = $(selector);
                if ($dropdown.length > 0) {
                    $dropdown.dropdown('set selected', value);
                }
            });
            
            // Additional hosts - populate after form is ready
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
        const callerIdSource = $('#cid_source').val();
        const didSource = $('#did_source').val();
        
        // Add custom header validation when custom source is selected
        const customHeaderRules = {
            rules: [{
                type: 'empty',
                prompt: globalTranslate.pr_ValidateCustomHeaderEmpty || 'Please specify custom header name',
            }, {
                type: 'regExp[/^[A-Za-z0-9-_]+$/]',
                prompt: globalTranslate.pr_ValidateCustomHeaderFormat || 'Header name can only contain letters, numbers, dash and underscore',
            }]
        };
        
        if (callerIdSource === 'custom') {
            rules.cid_custom_header = {
                identifier: 'cid_custom_header',
                ...customHeaderRules
            };
        }
        
        if (didSource === 'custom') {
            rules.did_custom_header = {
                identifier: 'did_custom_header',
                ...customHeaderRules
            };
        }
        
        // Regex validation if provided (optional fields)
        const regexValidationRule = {
            optional: true,
            rules: [{
                type: 'callback',
                callback: (value) => {
                    if (!value) return true;
                    try {
                        new RegExp(value);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                prompt: globalTranslate.pr_ValidateInvalidRegex || 'Invalid regular expression',
            }]
        };
        
        if ($('#cid_parser_regex').val()) {
            rules.cid_parser_regex = {
                identifier: 'cid_parser_regex',
                ...regexValidationRule
            };
        }
        
        if ($('#did_parser_regex').val()) {
            rules.did_parser_regex = {
                identifier: 'did_parser_regex',
                ...regexValidationRule
            };
        }
        
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
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
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
            $hostLabelText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host or IP Address');
        } else if (regType === 'none') {
            $hostLabelText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host or IP Address');
        }
        // For inbound, the field is hidden so no need to update label
    }
    
    /**
     * Update the visibility of elements based on the registration type
     */
    updateVisibilityElements() { 
        // Get element references
        const elHost = $('#elHost');
        const elUsername = $('#elUsername');
        const elSecret = $('#elSecret');
        const elPort = $('#elPort');
        const elAdditionalHost = $('#elAdditionalHosts');
        const elNetworkFilter = $('#elNetworkFilter');
        const regType = $('#registration_type').val();
        const genPassword = $('#generate-new-password');

        const valUserName = $('#username');
        const valSecret = this.$secret;
        const providerId = $('#id').val();

        // Reset username only when switching from inbound to other types
        if (valUserName.val() === providerId && regType !== 'inbound') {
            valUserName.val('');
        }
        valUserName.removeAttr('readonly');

        // Hide password tooltip by default
        this.hidePasswordTooltip();
        
        // Update host label based on registration type
        this.updateHostLabel(regType);

        // Update element visibility based on registration type
        if (regType === 'outbound') {
            elHost.show();
            elUsername.show();
            elSecret.show();
            elPort.show();
            elAdditionalHost.show(); // Show for all registration types
            elNetworkFilter.hide(); // Network filter not relevant for outbound
            $('#networkfilterid').val('none'); // Reset to default
            genPassword.hide();
            
            // Hide password management buttons for outbound registration
            $('#elSecret .button.clipboard').hide(); // Hide copy button
            $('#show-hide-password').hide(); // Hide show/hide button
            
            // Hide password strength indicator for outbound
            this.hidePasswordStrengthIndicator();
        } else if (regType === 'inbound') {
            valUserName.val(providerId);
            valUserName.attr('readonly', '');
            
            // Auto-generate password for inbound registration if empty
            if (valSecret.val().trim() === '') {
                this.generatePassword();
            }
            
            elHost.hide();
            elUsername.show();
            elSecret.show();
            elPort.hide(); // Port not needed for inbound registration
            elNetworkFilter.show(); // Network filter critical for inbound security
            genPassword.show();
            elAdditionalHost.show(); // Show for all registration types
            
            // Show password management buttons for inbound registration
            $('#elSecret .button.clipboard').show(); // Show copy button
            $('#show-hide-password').show(); // Show show/hide button
            
            // Show password strength indicator for inbound
            this.showPasswordStrengthIndicator(); 
            // Remove validation errors for hidden fields
            this.$formObj.form('remove prompt', 'host');
            $('#host').closest('.field').removeClass('error');
            this.$formObj.form('remove prompt', 'port');
            $('#port').closest('.field').removeClass('error');
        } else if (regType === 'none') {
            elHost.show();
            elUsername.show();
            elSecret.show();
            elPort.show();
            elAdditionalHost.show(); // Show for all registration types
            elNetworkFilter.show(); // Network filter critical for none type (no auth)
            genPassword.hide();
            
            // Show password management buttons for none registration
            $('#elSecret .button.clipboard').show(); // Show copy button
            $('#show-hide-password').show(); // Show show/hide button
            
            // Show tooltip icon for password field
            this.showPasswordTooltip();
            
            // Show password strength indicator for none type
            this.showPasswordStrengthIndicator();
            
            // Update field requirements - make password optional in none mode
            $('#elSecret').removeClass('required');
            
            // Remove validation prompts for optional fields in none mode
            this.$formObj.form('remove prompt', 'username');
            this.$formObj.form('remove prompt', 'secret');
        }

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
        const cidDropdown = $('.callerid-source-dropdown');
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
        const didDropdown = $('.did-source-dropdown');
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
     * Show password strength indicator and trigger initial check
     */
    showPasswordStrengthIndicator() {
        const $passwordProgress = $('#password-strength-progress');
        if ($passwordProgress.length > 0) {
            // Initialize progress component if not already done
            if (!$passwordProgress.hasClass('progress')) {
                $passwordProgress.progress({
                    percent: 0,
                    showActivity: false
                });
            }
            
            $passwordProgress.show();
            
            // Trigger password strength check if password exists
            if (this.$secret.val() && typeof PasswordScore !== 'undefined') {
                PasswordScore.checkPassStrength({
                    pass: this.$secret.val(),
                    bar: $passwordProgress,
                    section: $passwordProgress
                });
            }
        }
    }
    
    /**
     * Hide password strength indicator
     */
    hidePasswordStrengthIndicator() {
        const $passwordProgress = $('#password-strength-progress');
        if ($passwordProgress.length > 0) {
            $passwordProgress.hide();
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