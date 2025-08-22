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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderIaxTooltipManager, ProviderTooltipManager, i18n, ProvidersAPI */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
class ProviderIAX extends ProviderBase {
    constructor() { 
        super('IAX'); 
    }
    
    /**
     * Initialize the provider form
     */
    initialize() {
        super.initialize();
        
        // IAX-specific initialization
        this.initializeIaxWarningMessage();
        this.initializeRealtimeValidation();
        this.initializeRegistrationTypeHandlers();
        
        // Initialize tabs
        this.initializeTabs();
        
        // Re-validate form when receive_calls_without_auth changes
        $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', () => {
            const regType = $('#registration_type').val();
            
            // Clear any existing error on secret field
            this.$formObj.form('remove prompt', 'secret');
            this.$secret.closest('.field').removeClass('error');
            
            // For inbound registration, validate based on checkbox state
            if (regType === 'inbound') {
                const isChecked = $('#receive_calls_without_auth').checkbox('is checked');
                if (!isChecked && this.$secret.val() === '') {
                    // If unchecked and password is empty, show error
                    setTimeout(() => {
                        this.$formObj.form('validate field', 'secret');
                    }, 100);
                }
            }
            
            // Mark form as changed
            Form.dataChanged();
        });
        
        // Initialize field help tooltips
        this.initializeFieldTooltips();
    }
    
    /**
     * Initialize tab functionality
     */
    initializeTabs() {
        const self = this;
        
        // Disable diagnostics tab for new providers
        if (this.isNewProvider) {
            $('#provider-tabs-menu .item[data-tab="diagnostics"]')
                .addClass('disabled');
        } else {
            $('#provider-tabs-menu .item[data-tab="diagnostics"]')
                .removeClass('disabled');
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
     * Initialize field help tooltips
     */
    initializeFieldTooltips() {
        ProviderIaxTooltipManager.initialize();
    }
    
    /**
     * Initialize IAX warning message
     */
    initializeIaxWarningMessage() {
        // Show IAX deprecated warning if enabled
        const showIaxWarning = $('#show-iax-warning').val() === '1';
        if (showIaxWarning) {
            const warningHtml = `
                <div class="ui warning message" id="iax-deprecation-notice">
                    <i class="close icon"></i>
                    <div class="header">
                        ${globalTranslate.iax_DeprecationWarningTitle || 'IAX Protocol Notice'}
                    </div>
                    <p>${globalTranslate.iax_DeprecationWarningText || 'IAX protocol is deprecated. Consider using SIP instead.'}</p>
                </div>
            `;
            $('#iax-warning-placeholder').html(warningHtml);
            
            // Allow user to close the warning
            $('#iax-deprecation-notice .close.icon').on('click', function() {
                $(this).closest('.message').transition('fade');
            });
        }
    }
    
    /**
     * Initialize real-time validation for specific fields
     */
    initializeRealtimeValidation() {
        // Real-time validation for username - restrict special characters
        $('#username').on('input', function() {
            const $this = $(this);
            const value = $this.val();
            // Allow only alphanumeric, dash and underscore
            const cleanValue = value.replace(/[^a-zA-Z0-9_-]/g, '');
            if (value !== cleanValue) {
                $this.val(cleanValue);
                // Show warning about invalid characters
                $this.closest('.field').addClass('error');
                $this.parent().append('<div class="ui pointing red basic label temporary-warning">' +
                    (globalTranslate.pr_ValidationProviderLoginInvalidCharacters || 'Only letters, numbers, dash and underscore allowed') +
                    '</div>');
                // Remove warning after 3 seconds
                setTimeout(() => {
                    $('.temporary-warning').remove();
                    $this.closest('.field').removeClass('error');
                }, 3000);
            }
        });
    }
    
    /**
     * Initialize registration type change handlers
     */
    initializeRegistrationTypeHandlers() {
        // Already handled by parent class dropdown initialization
        // This is for IAX-specific behavior if needed
    }
    
    /**
     * Get validation rules based on provider settings
     * @returns {object} Validation rules for the form
     */
    getValidateRules() {
        const regType = $('#registration_type').val();
        const rules = {};
        
        // Common rules for all registration types
        rules.description = {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                },
            ],
        };
        
        // Rules based on registration type
        if (regType === 'outbound') {
            // OUTBOUND: We register to provider
            rules.host = {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9._-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores',
                    },
                ],
            };
            rules.username = {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9_-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters,
                    },
                ],
            };
            rules.secret = {
                identifier: 'secret',
                rules: [] // No validation for outbound passwords
            };
            rules.port = {
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
            };
        } else if (regType === 'inbound') {
            // INBOUND: Provider connects to us
            const receiveCallsChecked = $('#receive_calls_without_auth').checkbox('is checked');
            
            rules.username = {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9_-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters,
                    },
                ],
            };
            
            // Password validation only if receive_calls_without_auth is NOT checked
            if (!receiveCallsChecked) {
                rules.secret = {
                    identifier: 'secret',
                    rules: [
                        {
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                        },
                        {
                            type: 'minLength[5]',
                            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort,
                        }
                    ],
                };
            }
            
            // Host is optional for inbound
            // Port is not shown for inbound
        } else if (regType === 'none') {
            // NONE: Static peer-to-peer connection
            rules.host = {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9._-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores',
                    },
                ],
            };
            rules.username = {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                    {
                        type: 'regExp',
                        value: '/^[a-zA-Z0-9_-]+$/',
                        prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters,
                    },
                ],
            };
            // Password is optional for none mode
            rules.secret = {
                identifier: 'secret',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                    },
                ],
            };
            rules.port = {
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
            };
        }
        
        return rules;
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
            saveMethod: 'saveRecord',
            httpMethod: this.isNewProvider ? 'POST' : 'PUT'
        };
        
        // Set redirect URLs for save modes
        Form.afterSubmitIndexUrl = `${globalRootUrl}providers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}providers/modifyiax/`;
        
        // Enable automatic checkbox to boolean conversion
        Form.convertCheckboxesToBool = true;
        
        Form.initialize();
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
            receiveCalls: $('#elReceiveCalls'),
            networkFilter: $('#elNetworkFilter')
        };
        
        const fields = {
            username: $('#username'),
            secret: this.$secret,
            port: $('#port'),
            qualify: $('#qualify')
        };
        
        const labels = {
            host: $('#hostLabelText'),
            port: $('#portLabelText'),
            username: $('#usernameLabelText'),
            secret: $('#secretLabelText')
        };
        
        // Configuration for each registration type
        const configs = {
            outbound: {
                visible: ['host', 'port', 'username', 'secret'],
                hidden: ['receiveCalls', 'networkFilter'],
                required: ['host', 'port', 'username', 'secret'],
                labels: {
                    host: globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP',
                    port: globalTranslate.pr_ProviderPort || 'Provider Port',
                    username: globalTranslate.pr_ProviderLogin || 'Login',
                    secret: globalTranslate.pr_ProviderPassword || 'Password'
                },
                passwordWidget: {
                    generateButton: false,
                    showPasswordButton: false,
                    clipboardButton: false,
                    showStrengthBar: false,
                    validation: PasswordWidget.VALIDATION.NONE
                },
                defaultPort: '4569'
            },
            inbound: {
                visible: ['host', 'username', 'secret', 'receiveCalls', 'networkFilter'],
                hidden: ['port'],
                required: ['username', 'secret'],
                optional: ['host', 'port'],
                labels: {
                    host: globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP',
                    username: globalTranslate.pr_AuthenticationUsername || 'Authentication Username',
                    secret: globalTranslate.pr_AuthenticationPassword || 'Authentication Password'
                },
                passwordWidget: {
                    generateButton: true,
                    showPasswordButton: true,
                    clipboardButton: true,
                    showStrengthBar: true,
                    validation: PasswordWidget.VALIDATION.SOFT
                },
                readonlyUsername: true,
                autoGeneratePassword: true
            },
            none: {
                visible: ['host', 'port', 'username', 'secret', 'receiveCalls', 'networkFilter'],
                hidden: [],
                required: ['host', 'port', 'username'],
                optional: ['secret'],
                labels: {
                    host: globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP',
                    port: globalTranslate.pr_PeerPort || 'Peer Port',
                    username: globalTranslate.pr_PeerUsername || 'Peer Username',
                    secret: globalTranslate.pr_PeerPassword || 'Peer Password'
                },
                passwordWidget: {
                    generateButton: true,
                    showPasswordButton: true,
                    clipboardButton: true,
                    showStrengthBar: true,
                    validation: PasswordWidget.VALIDATION.SOFT
                },
                defaultPort: '4569',
                showPasswordTooltip: true
            }
        };
        
        // Get current configuration
        const config = configs[regType] || configs.outbound;
        
        // Apply visibility
        config.visible.forEach(key => elements[key]?.show());
        config.hidden.forEach(key => elements[key]?.hide());
        
        // Apply required/optional classes
        config.required?.forEach(key => elements[key]?.addClass('required'));
        config.optional?.forEach(key => elements[key]?.removeClass('required'));
        
        // Update labels
        Object.entries(config.labels).forEach(([key, text]) => {
            labels[key]?.text(text);
        });
        
        // Handle username field for inbound
        if (config.readonlyUsername) {
            fields.username.val(providerId).attr('readonly', '');
        } else {
            fields.username.removeAttr('readonly');
        }
        
        // Auto-generate password for inbound if empty
        if (config.autoGeneratePassword && fields.secret.val().trim() === '' && this.passwordWidget) {
            this.passwordWidget.elements.$generateBtn?.trigger('click');
        }
        
        // Set default port if needed
        if (config.defaultPort && (fields.port.val() === '' || fields.port.val() === '0')) {
            fields.port.val(config.defaultPort);
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
        
        // Always enable qualify for IAX (NAT keepalive)
        fields.qualify.prop('checked', true).val('1');
        
        // Clear validation errors for hidden fields
        config.hidden.forEach(key => {
            const fieldName = key.replace('el', '').toLowerCase();
            this.$formObj.form('remove prompt', fieldName);
            $(`#${fieldName}`).closest('.field').removeClass('error');
        });
    }

    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified form settings
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        
        // Form.js with apiSettings.enabled will automatically:
        // 1. Collect form data
        // 2. Convert checkboxes using convertCheckboxesToBool
        // 3. Call the API using apiSettings configuration
        
        // Just add provider-specific data
        result.data.type = 'IAX';
        
        // Ensure ID field exists
        result.data.id = result.data.id || '';
        
        return result;
    }

    /**
     * Callback after form submission
     * @param {object} response - Response from server
     */
    cbAfterSendForm(response) {
        if (response.result === true && response.data && response.data.id) {
            const newId = response.data.id;
            
            // Update the form ID field
            $('#id').val(newId);
            
            // Update isNewProvider flag
            this.isNewProvider = false;
            
            // Enable diagnostics tab for existing providers
            $('#provider-tabs-menu .item[data-tab="diagnostics"]')
                .removeClass('disabled')
                .css('opacity', '')
                .css('cursor', '');
            
            // Update the browser URL without reloading
            const newUrl = `${globalRootUrl}providers/modifyiax/${newId}`;
            window.history.pushState({ id: newId }, '', newUrl);
        }
    }
    
    /**
     * Populate form with data from API
     * @param {object} data - Provider data
     */
    populateFormData(data) {
        super.populateFormData(data);
        
        // IAX-specific data population can be added here if needed
    }
}

/**
 * Initialize provider form on document ready
 */
$(document).ready(() => {
    const provider = new ProviderIAX();
    provider.initialize();
});