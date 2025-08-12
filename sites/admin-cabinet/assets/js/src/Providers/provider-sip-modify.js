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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, TooltipBuilder, i18n */

/**
 * SIP provider management form
 * @class ProviderSIP
 */
class ProviderSIP extends ProviderBase {  
    constructor() {
        super('SIP');
        this.$qualifyToggle = $('#qualify');
        this.$qualifyFreqToggle = $('#qualify-freq');
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

        $('#disablefromuser input').on('change', () => {
            this.updateVisibilityElements();
            Form.dataChanged();
        });
        
        // Re-initialize accordion with visibility update on open
        this.initializeAccordion();
        
        // Initialize field help tooltips
        this.initializeFieldTooltips();
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
        Form.afterSubmitIndexUrl = globalRootUrl + 'providers/index/';
        Form.afterSubmitModifyUrl = globalRootUrl + 'providers/modify/';
        
        Form.initialize();
    }
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = this.$formObj.form('get values');
        
        // Add provider type
        result.data.type = this.providerType;
        
        // Convert checkbox values to proper booleans
        const booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
        booleanFields.forEach((field) => {
            if (result.data.hasOwnProperty(field)) {
                // Convert various checkbox representations to boolean
                result.data[field] = result.data[field] === true || 
                                     result.data[field] === 'true' || 
                                     result.data[field] === '1' || 
                                     result.data[field] === 'on';
            }
        });
        
        // Handle additional hosts for SIP - collect from table
        const additionalHosts = [];
        $('#additional-hosts-table tbody tr.host-row').each(function() {
            const host = $(this).find('td.address').text().trim();
            if (host) {
                additionalHosts.push({address: host});
            }
        });
        
        // Only add if there are hosts
        if (additionalHosts.length > 0) {
            result.data.additionalHosts = additionalHosts;
        }
        
        return result;
    }
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        super.cbAfterSendForm(response);
        
        if (response.result && response.data) {
            // Update form with response data if needed
            if (response.data.uniqid && !$('#uniqid').val()) {
                $('#uniqid').val(response.data.uniqid);
            }
            
            // The Form.js will handle the reload automatically if response.reload is present
            // For new records, REST API returns reload path like "providers/modifysip/SIP-TRUNK-xxx"
        }
    }
    
    /**
     * Initialize accordion with custom callbacks
     */
    initializeAccordion() {
        const self = this;
        this.$accordions.accordion({
            onOpen: function() {
                // Update field visibility when accordion opens
                setTimeout(() => {
                    self.updateVisibilityElements();
                }, 50);
            }
        });
    }
    
    /**
     * Initialize field help tooltips in firewall style
     */
    initializeFieldTooltips() {
        // Build tooltip data structures
        const registrationTypeData = {
            header: globalTranslate.pr_RegistrationTypeTooltip_header,
            list: [
                {
                    term: globalTranslate.pr_RegistrationTypeTooltip_outbound,
                    definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc
                },
                {
                    term: globalTranslate.pr_RegistrationTypeTooltip_inbound,
                    definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc
                },
                {
                    term: globalTranslate.pr_RegistrationTypeTooltip_none,
                    definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc
                }
            ]
        };

        const networkFilterData = {
            header: globalTranslate.pr_NetworkFilterTooltip_header,
            description: globalTranslate.pr_NetworkFilterTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_NetworkFilterTooltip_inbound,
                    definition: globalTranslate.pr_NetworkFilterTooltip_inbound_desc
                },
                {
                    term: globalTranslate.pr_NetworkFilterTooltip_outbound,
                    definition: globalTranslate.pr_NetworkFilterTooltip_outbound_desc
                },
                {
                    term: globalTranslate.pr_NetworkFilterTooltip_none,
                    definition: globalTranslate.pr_NetworkFilterTooltip_none_desc
                }
            ]
        };

        const receiveCallsData = {
            header: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_header,
            description: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_desc,
            warning: {
                header: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_warning_header,
                text: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_application,
                    definition: globalTranslate.pr_ReceiveCallsWithoutAuthTooltip_application_desc
                }
            ]
        };

        const outboundProxyData = {
            header: globalTranslate.pr_OutboundProxyTooltip_header,
            description: globalTranslate.pr_OutboundProxyTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_OutboundProxyTooltip_format,
                    definition: globalTranslate.pr_OutboundProxyTooltip_format_examples
                },
                {
                    term: globalTranslate.pr_OutboundProxyTooltip_usage,
                    definition: globalTranslate.pr_OutboundProxyTooltip_usage_desc
                }
            ]
        };

        const transportProtocolData = {
            header: globalTranslate.pr_TransportProtocolTooltip_header,
            description: globalTranslate.pr_TransportProtocolTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_protocols_header,
                    definition: null
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_udp_tcp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_udp_tcp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_udp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_udp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_tcp,
                    definition: globalTranslate.pr_TransportProtocolTooltip_tcp_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_tls,
                    definition: globalTranslate.pr_TransportProtocolTooltip_tls_desc
                },
                {
                    term: globalTranslate.pr_TransportProtocolTooltip_recommendations_header,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_TransportProtocolTooltip_rec_compatibility,
                globalTranslate.pr_TransportProtocolTooltip_rec_security,
                globalTranslate.pr_TransportProtocolTooltip_rec_provider
            ]
        };

        const qualifySessionData = {
            header: globalTranslate.pr_QualifySessionTooltip_header,
            description: globalTranslate.pr_QualifySessionTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_QualifySessionTooltip_purpose,
                    definition: globalTranslate.pr_QualifySessionTooltip_purpose_desc
                },
                {
                    term: globalTranslate.pr_QualifySessionTooltip_recommendation,
                    definition: globalTranslate.pr_QualifySessionTooltip_recommendation_desc
                }
            ]
        };

        const fromRedefinitionData = {
            header: globalTranslate.pr_FromRedefinitionTooltip_header,
            warning: {
                text: globalTranslate.pr_FromRedefinitionTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_user,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_user_desc
                },
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_domain,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_domain_desc
                },
                {
                    term: globalTranslate.pr_FromRedefinitionTooltip_usage,
                    definition: globalTranslate.pr_FromRedefinitionTooltip_usage_desc
                }
            ]
        };

        const sipPortData = {
            header: globalTranslate.pr_SIPPortTooltip_header,
            description: globalTranslate.pr_SIPPortTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_SIPPortTooltip_default,
                    definition: globalTranslate.pr_SIPPortTooltip_default_value
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_standard_ports,
                    definition: null
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_port_5060,
                    definition: globalTranslate.pr_SIPPortTooltip_port_5060_desc
                },
                {
                    term: globalTranslate.pr_SIPPortTooltip_port_5061,
                    definition: globalTranslate.pr_SIPPortTooltip_port_5061_desc
                }
            ],
            note: globalTranslate.pr_SIPPortTooltip_note
        };

        const manualAttributesData = {
            header: globalTranslate.pr_ManualAttributesTooltip_header,
            description: globalTranslate.pr_ManualAttributesTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_format,
                    definition: globalTranslate.pr_ManualAttributesTooltip_format_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_examples_header,
                    definition: null
                }
            ],
            examples: [
                '[endpoint]',
                'contact_user=231',
                'direct_media=no',
                'rtp_symmetric=no',
                'timers=10',
                'max_retries=10',
                '', 
                '',
                '[aor]',
                'qualify_frequency=60',
                '',
                '',
                '[registration]',
                'retry_interval=60',
                'max_retries=10'
            ],
            list3: [
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_common_params,
                    definition: null
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_contact_user,
                    definition: globalTranslate.pr_ManualAttributesTooltip_contact_user_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_direct_media,
                    definition: globalTranslate.pr_ManualAttributesTooltip_direct_media_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric,
                    definition: globalTranslate.pr_ManualAttributesTooltip_rtp_symmetric_desc
                },
                {
                    term: globalTranslate.pr_ManualAttributesTooltip_timers,
                    definition: globalTranslate.pr_ManualAttributesTooltip_timers_desc
                }
            ],
            note: globalTranslate.pr_ManualAttributesTooltip_warning
        };

        const providerHostData = {
            header: globalTranslate.pr_ProviderHostTooltip_header,
            description: globalTranslate.pr_ProviderHostTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_ProviderHostTooltip_formats,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_ProviderHostTooltip_format_ip,
                globalTranslate.pr_ProviderHostTooltip_format_domain
            ],
            list3: [
                {
                    term: globalTranslate.pr_ProviderHostTooltip_outbound,
                    definition: globalTranslate.pr_ProviderHostTooltip_outbound_desc
                },
                {
                    term: globalTranslate.pr_ProviderHostTooltip_none,
                    definition: globalTranslate.pr_ProviderHostTooltip_none_desc
                }
            ],
            note: globalTranslate.pr_ProviderHostTooltip_note
        };

        const additionalHostsData = {
            header: globalTranslate.pr_AdditionalHostsTooltip_header,
            description: globalTranslate.pr_AdditionalHostsTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_purposes,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_AdditionalHostsTooltip_purpose_id,
                globalTranslate.pr_AdditionalHostsTooltip_purpose_multi,
                globalTranslate.pr_AdditionalHostsTooltip_purpose_security
            ],
            list3: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_use_cases,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.pr_AdditionalHostsTooltip_use_geo,
                globalTranslate.pr_AdditionalHostsTooltip_use_backup,
                globalTranslate.pr_AdditionalHostsTooltip_use_cloud
            ],
            list5: [
                {
                    term: globalTranslate.pr_AdditionalHostsTooltip_formats,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.pr_AdditionalHostsTooltip_format_ip,
                globalTranslate.pr_AdditionalHostsTooltip_format_subnet,
                globalTranslate.pr_AdditionalHostsTooltip_format_domain
            ],
            note: globalTranslate.pr_AdditionalHostsTooltip_important
        };

        const dtmfModeData = {
            header: globalTranslate.pr_DTMFModeTooltip_header,
            description: globalTranslate.pr_DTMFModeTooltip_desc,
            list: [
                {
                    term: globalTranslate.pr_DTMFModeTooltip_modes_header,
                    definition: null
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_auto,
                    definition: globalTranslate.pr_DTMFModeTooltip_auto_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_inband,
                    definition: globalTranslate.pr_DTMFModeTooltip_inband_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_info,
                    definition: globalTranslate.pr_DTMFModeTooltip_info_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_rfc4733,
                    definition: globalTranslate.pr_DTMFModeTooltip_rfc4733_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_auto_info,
                    definition: globalTranslate.pr_DTMFModeTooltip_auto_info_desc
                },
                {
                    term: globalTranslate.pr_DTMFModeTooltip_usage_header,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.pr_DTMFModeTooltip_usage_ivr,
                globalTranslate.pr_DTMFModeTooltip_usage_pin,
                globalTranslate.pr_DTMFModeTooltip_usage_conf,
                globalTranslate.pr_DTMFModeTooltip_usage_features
            ],
            note: globalTranslate.pr_DTMFModeTooltip_recommendation_desc
        };

        const tooltipConfigs = {
            'registration_type': registrationTypeData,
            'receive_calls_without_auth': receiveCallsData,
            'network_filter': networkFilterData,
            'outbound_proxy': outboundProxyData,
            'transport_protocol': transportProtocolData,
            'qualify_session': qualifySessionData,
            'from_redefinition': fromRedefinitionData,
            'sip_port': sipPortData,
            'manual_attributes': manualAttributesData,
            'provider_host': providerHostData,
            'additional_hosts': additionalHostsData,
            'dtmf_mode': dtmfModeData
        };
        
        // Initialize tooltips using TooltipBuilder
        TooltipBuilder.initialize(tooltipConfigs);
    }

    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */
    getValidateRules() {
        const regType = $('#registration_type').val();
        
        switch (regType) {
            case 'outbound':
                return this.getOutboundRules();
            case 'inbound':
                return this.getInboundRules();
            case 'none':
                return this.getNoneRules();
            default:
                return this.getOutboundRules();
        }
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
        const elUniqId = $('#uniqid');
        const genPassword = $('#generate-new-password');

        const valUserName = $('#username');
        const valSecret = this.$secret; 

        // Reset username only when switching from inbound to other types
        if (valUserName.val() === elUniqId.val() && regType !== 'inbound') {
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
            elAdditionalHost.show();
            elNetworkFilter.hide(); // Network filter not relevant for outbound
            $('#networkfilterid').val('none'); // Reset to default
            genPassword.hide();
        } else if (regType === 'inbound') {
            valUserName.val(elUniqId.val());
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
            elAdditionalHost.hide(); 
            // Remove validation errors for hidden fields
            this.$formObj.form('remove prompt', 'host');
            $('#host').closest('.field').removeClass('error');
            this.$formObj.form('remove prompt', 'port');
            $('#port').closest('.field').removeClass('error');
            
            // Restore network filter state if needed
            this.restoreNetworkFilterState();
        } else if (regType === 'none') {
            elHost.show();
            elUsername.show();
            elSecret.show();
            elPort.show();
            elAdditionalHost.show();
            elNetworkFilter.show(); // Network filter critical for none type (no auth)
            genPassword.hide();
            
            // Show tooltip icon for password field
            this.showPasswordTooltip();
            
            // Update field requirements - make password optional in none mode
            $('#elSecret').removeClass('required');
            
            // Remove validation prompts for optional fields in none mode
            this.$formObj.form('remove prompt', 'username');
            this.$formObj.form('remove prompt', 'secret');
            
            // Restore network filter state if needed
            this.restoreNetworkFilterState();
        }

        // Update element visibility based on 'disablefromuser' checkbox
        const el = $('#disablefromuser');
        const fromUser = $('#divFromUser');
        if (el.checkbox('is checked')) {
            fromUser.hide();
            fromUser.removeClass('visible');
        } else {
            fromUser.show();
            fromUser.addClass('visible');
        }
    }
}