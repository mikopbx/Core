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

/* global globalRootUrl,globalTranslate, Form, firewallTooltips, FirewallAPI, FormElements, UserMessage */

/**
 * The firewall object contains methods and variables for managing the Firewall form
 *
 * @module firewall
 */
const firewall = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#firewall-form'),
    
    /**
     * Firewall record ID.
     * @type {string}
     */
    recordId: '',
    
    /**
     * Firewall data from API.
     * @type {Object}
     */
    firewallData: null,

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        ipv4_network: {
            identifier: 'ipv4_network',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    // Strict IPv4: each octet 0-255
                    value: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                    prompt: globalTranslate.fw_ValidateIPv4Address,
                },
            ],
        },
        ipv6_network: {
            identifier: 'ipv6_network',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    // Strict IPv6: RFC 4291 compliant (all standard notations including compressed ::)
                    value: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
                    prompt: globalTranslate.fw_ValidateIPv6Address,
                },
            ],
        },
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.fw_ValidateRuleName,
                },
            ],
        },
    },

    // Initialization function to set up form behavior
    initialize() {
        // Initialize global variables for tooltips and Docker detection
        // These will be updated when data is loaded from API
        window.servicePortInfo = {};
        window.serviceNameMapping = {};
        window.isDocker = false;
        window.dockerSupportedServices = [];
        window.currentNetwork = '';
        window.currentSubnet = '';

        // Get record ID from URL or form
        const urlParts = window.location.pathname.split('/');
        const lastSegment = urlParts[urlParts.length - 1] || '';

        // Check if the last segment is 'modify' (new record) or an actual ID
        if (lastSegment === 'modify' || lastSegment === '') {
            firewall.recordId = '';
        } else {
            firewall.recordId = lastSegment;
        }

        // Read URL parameters for prefilling (e.g., ?network=0.0.0.0&subnet=0)
        firewall.urlParameters = firewall.getUrlParameters();

        // Initialize Form BEFORE loading data (like extension-modify.js pattern)
        firewall.initializeForm();

        // Load firewall data from API
        firewall.loadFirewallData();
    },

    /**
     * Get URL parameters for prefilling the form
     * @returns {Object} Object with network, subnet, and ruleName parameters
     */
    getUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        return {
            network: params.get('network') || '',
            subnet: params.get('subnet') || '',
            ruleName: params.get('ruleName') || ''
        };
    },

    /**
     * Load firewall data from API.
     * Unified method for both new and existing records.
     * API returns defaults for new records when ID is empty.
     */
    loadFirewallData() {
        firewall.$formObj.addClass('loading');

        // Always call API - it returns defaults for new records (when ID is empty)
        FirewallAPI.getRecord(firewall.recordId || '', (response) => {
            firewall.$formObj.removeClass('loading');

            if (!response || !response.result) {
                // Show error and stop
                UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord);
                return;
            }

            firewall.firewallData = response.data;

            // Generate dynamic rules HTML first
            firewall.generateRulesHTML(response.data);

            // Prepare data for form population
            const formData = firewall.prepareFormData(response.data);

            // Use Form.populateFormSilently() like extension-modify.js pattern
            Form.populateFormSilently(formData, {
                afterPopulate: (populatedData) => {
                    // Initialize UI elements AFTER form is populated
                    firewall.initializeUIElements();
                    firewall.initializeTooltips();
                    firewall.initializeDockerLimitedCheckboxes();

                    // Update window variables for tooltips
                    window.currentNetwork = response.data.network;
                    window.currentSubnet = response.data.subnet;
                    window.isDocker = response.data.isDocker || false;
                    window.dockerSupportedServices = response.data.dockerSupportedServices || [];
                }
            });
        });
    },
    
    /**
     * Check if address is IPv6.
     * @param {string} address - IP address to check.
     * @returns {boolean} True if IPv6, false if IPv4.
     */
    isIPv6Address(address) {
        // IPv6 contains colons
        return address && address.includes(':');
    },

    /**
     * Prepare form data from API response
     * Converts API fields to form field names (network/subnet -> ipv4/ipv6 fields)
     * @param {Object} data - API response data
     * @returns {Object} Form data ready for Form.populateFormSilently()
     */
    prepareFormData(data) {
        const formData = {
            id: data.id || '',
            description: data.description || '',
            newer_block_ip: data.newer_block_ip === true,
            local_network: data.local_network === true
        };

        // For new records, override network/subnet/description with URL parameters if provided
        let network = data.network || '';
        let subnet = data.subnet;

        // Default to /32 for new records (data.subnet is '0' from API defaults)
        if (!data.id && (!subnet || subnet === '0')) {
            subnet = '32';
        }

        if (!data.id && firewall.urlParameters.network) {
            network = firewall.urlParameters.network;
            subnet = firewall.urlParameters.subnet || '32';

            // Override description with ruleName from URL if provided
            if (firewall.urlParameters.ruleName) {
                formData.description = firewall.urlParameters.ruleName;
            }
        }

        // Detect IP version and populate appropriate fields
        const isIPv6 = firewall.isIPv6Address(network);

        if (isIPv6) {
            // IPv6 data
            formData.ipv6_network = network;
            formData.ipv6_subnet = subnet;
            formData.ipv4_network = '';
            formData.ipv4_subnet = '';
        } else {
            // IPv4 data
            formData.ipv4_network = network;
            formData.ipv4_subnet = subnet;
            formData.ipv6_network = '';
            formData.ipv6_subnet = '';
        }

        // Add rule checkboxes from currentRules
        if (data.currentRules && typeof data.currentRules === 'object') {
            Object.keys(data.currentRules).forEach(category => {
                formData[`rule_${category}`] = data.currentRules[category] === true;
            });
        }

        // Build service port info and name mapping from availableRules
        window.servicePortInfo = {};
        window.serviceNameMapping = {};
        if (data.availableRules && typeof data.availableRules === 'object') {
            Object.keys(data.availableRules).forEach(category => {
                const ruleTemplate = data.availableRules[category];
                // Extract port info from rule template
                window.servicePortInfo[category] = firewall.extractPortsFromTemplate(ruleTemplate);
                // Map display name to category key
                const shortName = ruleTemplate.shortName || category;
                window.serviceNameMapping[shortName] = category;
            });
        }

        return formData;
    },

    /**
     * Extract port information from rule template.
     * @param {Object} ruleTemplate - Rule template from availableRules.
     * @returns {Array} Array of port information objects.
     */
    extractPortsFromTemplate(ruleTemplate) {
        const ports = [];

        if (ruleTemplate.rules && Array.isArray(ruleTemplate.rules)) {
            ruleTemplate.rules.forEach(rule => {
                if (rule.protocol === 'icmp') {
                    ports.push({
                        protocol: 'ICMP'
                    });
                } else if (rule.portfrom === rule.portto) {
                    ports.push({
                        port: rule.portfrom,
                        protocol: rule.protocol.toUpperCase()
                    });
                } else {
                    ports.push({
                        range: `${rule.portfrom}-${rule.portto}`,
                        protocol: rule.protocol.toUpperCase()
                    });
                }
            });
        }

        return ports;
    },

    /**
     * Generate HTML for firewall rules based on API data.
     * @param {Object} data - Firewall data from API.
     */
    generateRulesHTML(data) {
        const $container = $('#firewall-rules-container');
        $container.empty().removeClass('loading');

        // Use new naming: availableRules for templates, currentRules for actual values
        const availableRules = data.availableRules;
        const currentRules = data.currentRules || {};

        if (!availableRules) {
            console.error('No available rules data received from API');
            $container.html('<div class="ui warning message">Unable to load firewall rules. Please refresh the page.</div>');
            return;
        }

        const isDocker = data.isDocker || false;
        const dockerSupportedServices = data.dockerSupportedServices || [];

        // Generate HTML for each rule
        Object.keys(availableRules).forEach(name => {
            const ruleTemplate = availableRules[name];
            const shortName = ruleTemplate.shortName || name;
            const isLimited = isDocker && !dockerSupportedServices.includes(shortName);
            // Get actual value from currentRules, default to template default
            const isChecked = currentRules[name] !== undefined ? currentRules[name] : (ruleTemplate.action === 'allow');

            const segmentClass = isLimited ? 'docker-limited-segment' : '';
            const checkboxClass = isLimited ? 'docker-limited-checkbox' : '';
            const iconClass = isLimited ? 'yellow exclamation triangle' : 'small info circle';

            const html = `
                <div class="ui segment ${segmentClass}">
                    <div class="field">
                        <div class="ui toggle checkbox rules ${checkboxClass}">
                            <input type="checkbox"
                                   id="rule_${name}"
                                   name="rule_${name}"
                                   ${isLimited || isChecked ? 'checked' : ''}
                                   ${isLimited ? 'disabled' : ''}
                                   tabindex="0" class="hidden">
                            <label for="rule_${name}">
                                ${globalTranslate[`fw_${name.toLowerCase()}Description`] || shortName}
                                <i class="${iconClass} icon service-info-icon"
                                   data-service="${name}"
                                   data-action="${ruleTemplate.action}"
                                   ${isLimited ? 'data-limited="true"' : ''}></i>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            $container.append(html);
        });

        // Re-initialize checkboxes for dynamically added elements with onChange handler
        $('#firewall-rules-container .checkbox').checkbox({
            onChange: () => {
                Form.dataChanged();
            }
        });
    },
    
    /**
     * Initialize UI elements.
     */
    initializeUIElements() {
        // Initialize checkboxes (excluding dynamically added rules which are handled in generateRulesHTML)
        $('#firewall-form .checkbox').not('#firewall-rules-container .checkbox').checkbox();

        // Initialize dropdowns
        $('#firewall-form .dropdown').dropdown();

        // Initialize input mask for IPv4 network field only (IPv6 doesn't need input mask)
        $('input[name="ipv4_network"]').inputmask({alias: 'ip', 'placeholder': '_'});

        // Auto-clear opposite protocol fields when user types
        this.setupProtocolAutoClear();
    },

    /**
     * Setup auto-clear logic for IPv4/IPv6 fields
     * When user types in IPv4 fields -> clear IPv6 fields
     * When user types in IPv6 fields -> clear IPv4 fields
     */
    setupProtocolAutoClear() {
        const $ipv4Network = $('input[name="ipv4_network"]');
        const $ipv4Subnet = $('select[name="ipv4_subnet"]');
        const $ipv6Network = $('input[name="ipv6_network"]');
        const $ipv6Subnet = $('select[name="ipv6_subnet"]');

        // When user types in IPv4 network field -> clear IPv6 fields
        $ipv4Network.on('input', () => {
            const value = $ipv4Network.val().trim();
            if (value && value !== '') {
                $ipv6Network.val('');
                $ipv6Subnet.dropdown('clear');
            }
        });

        // When user selects IPv4 subnet -> clear IPv6 fields
        $ipv4Subnet.on('change', () => {
            const networkValue = $ipv4Network.val().trim();
            if (networkValue && networkValue !== '') {
                $ipv6Network.val('');
                $ipv6Subnet.dropdown('clear');
            }
        });

        // When user types in IPv6 network field -> clear IPv4 fields
        $ipv6Network.on('input', () => {
            const value = $ipv6Network.val().trim();
            if (value && value !== '') {
                $ipv4Network.val('');
                $ipv4Subnet.dropdown('clear');
            }
        });

        // When user selects IPv6 subnet -> clear IPv4 fields
        $ipv6Subnet.on('change', () => {
            const networkValue = $ipv6Network.val().trim();
            if (networkValue && networkValue !== '') {
                $ipv4Network.val('');
                $ipv4Subnet.dropdown('clear');
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
        const formData = result.data || firewall.$formObj.form('get values');

        // Get IPv4 and IPv6 values
        const ipv4Network = formData.ipv4_network || '';
        const ipv4Subnet = formData.ipv4_subnet || '';
        const ipv6Network = formData.ipv6_network || '';
        const ipv6Subnet = formData.ipv6_subnet || '';

        // Validate: either IPv4 OR IPv6, not both, not neither
        const hasIPv4 = ipv4Network && ipv4Network !== '';
        const hasIPv6 = ipv6Network && ipv6Network !== '';

        if (!hasIPv4 && !hasIPv6) {
            UserMessage.showError(globalTranslate.fw_ValidateEitherIPv4OrIPv6Required);
            return false;
        }
        if (hasIPv4 && hasIPv6) {
            UserMessage.showError(globalTranslate.fw_ValidateOnlyOneProtocol);
            return false;
        }

        // Combine selected IPv4 or IPv6 into backend-compatible network/subnet format
        formData.network = hasIPv4 ? ipv4Network : ipv6Network;
        formData.subnet = hasIPv4 ? ipv4Subnet : ipv6Subnet;

        // Remove separate IPv4/IPv6 fields (backend expects unified network/subnet)
        delete formData.ipv4_network;
        delete formData.ipv4_subnet;
        delete formData.ipv6_network;
        delete formData.ipv6_subnet;

        // Prepare currentRules data for API (simple boolean map)
        const currentRules = {};
        Object.keys(formData).forEach(key => {
            if (key.startsWith('rule_')) {
                const category = key.replace('rule_', '');
                // Send as boolean - true = allow, false = block
                currentRules[category] = formData[key] === true;
                delete formData[key];
            }
        });

        // Add currentRules to formData
        formData.currentRules = currentRules;

        // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool

        // Mark as new record if we don't have an ID (for correct POST/PUT selection)
        // This is critical for creating records with predefined IDs
        if (!firewall.recordId || firewall.recordId === '') {
            formData._isNew = true;
        }

        result.data = formData;
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {

    },
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        // Configure Form.js
        Form.$formObj = firewall.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = firewall.validateRules;
        Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
        Form.cbAfterSendForm = firewall.cbAfterSendForm;

        // Enable checkbox to boolean conversion
        Form.convertCheckboxesToBool = true;

        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = FirewallAPI;
        Form.apiSettings.saveMethod = 'saveRecord';

        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}firewall/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}firewall/modify/`;

        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();

        // Add change handlers for dynamically added checkboxes
        // This must be done AFTER Form.initialize() to ensure proper tracking
        $('#firewall-rules-container input[type="checkbox"]').on('change', function() {
            // Trigger form change event for dirty checking
            Form.dataChanged();
        });
    },
    
    /**
     * Initialize tooltips for service information
     */
    initializeTooltips() {
        const self = this;
        
        // Initialize tooltips for service rules
        $('.service-info-icon').each(function() {
            const $icon = $(this);
            const service = $icon.data('service');
            const isLimited = $icon.data('limited') === true;
            
            // Find the checkbox for this service
            const $checkbox = $icon.closest('.field').find('input[type="checkbox"]');
            
            // Get initial action based on checkbox state
            const action = $checkbox.prop('checked') ? 'allow' : 'block';
            
            // Generate initial tooltip content
            const network = `${window.currentNetwork}/${window.currentSubnet}`;
            const portInfo = window.servicePortInfo[service] || [];
            const tooltipContent = firewallTooltips.generateContent(
                service, 
                action, 
                network, 
                window.isDocker, 
                isLimited, 
                portInfo, 
                isLimited && window.isDocker // Show copy button only for Docker limited services
            );
            
            // Initialize tooltip
            firewallTooltips.initializeTooltip($icon, {
                html: tooltipContent,
                position: 'top right'
            });
            
            // Store reference to icon on checkbox for updates
            $checkbox.data('tooltipIcon', $icon);
        });
        
        // Initialize tooltips for special checkboxes
        $('.special-checkbox-info').each(function() {
            const $icon = $(this);
            const type = $icon.data('type');
            
            // Find the checkbox for this type
            const $checkbox = $icon.closest('.field').find(`input[name="${type}"]`);
            
            // Get initial state
            const isChecked = $checkbox.prop('checked');
            const network = `${window.currentNetwork}/${window.currentSubnet}`;
            
            // Generate initial tooltip content
            const tooltipContent = firewallTooltips.generateSpecialCheckboxContent(
                type,
                network,
                isChecked
            );
            
            // Initialize tooltip with compact width for special checkboxes
            firewallTooltips.initializeTooltip($icon, {
                html: tooltipContent,
                position: 'top right',
                variation: 'very wide'
            });
            
            // Store reference to icon on checkbox for updates
            $checkbox.data('specialTooltipIcon', $icon);
        });
        
        // Listen for checkbox changes to update tooltips (use delegation for dynamic elements)
        $('#firewall-form').on('change', '.rules input[type="checkbox"]', function() {
            const $checkbox = $(this);
            const $icon = $checkbox.data('tooltipIcon');
            const $specialIcon = $checkbox.data('specialTooltipIcon');
            
            if ($icon && $icon.length) {
                const service = $icon.data('service');
                const isLimited = $icon.data('limited') === true;
                const action = $checkbox.prop('checked') ? 'allow' : 'block';
                const network = `${window.currentNetwork}/${window.currentSubnet}`;
                const portInfo = window.servicePortInfo[service] || [];
                
                // Generate new tooltip content
                const newContent = firewallTooltips.generateContent(
                    service, 
                    action, 
                    network, 
                    window.isDocker, 
                    isLimited, 
                    portInfo, 
                    isLimited && window.isDocker
                );
                
                // Update tooltip
                firewallTooltips.updateContent($icon, newContent);
            }
            
            if ($specialIcon && $specialIcon.length) {
                const type = $specialIcon.data('type');
                const isChecked = $checkbox.prop('checked');
                const network = `${window.currentNetwork}/${window.currentSubnet}`;
                
                // Generate new tooltip content
                const newContent = firewallTooltips.generateSpecialCheckboxContent(
                    type,
                    network,
                    isChecked
                );
                
                // Update tooltip with compact width
                firewallTooltips.updateContent($specialIcon, newContent, {
                    position: 'top right',
                    variation: 'very wide'
                });
            }
        });
    },
    
    /**
     * Initialize Docker limited checkboxes - prevent them from being toggled
     */
    initializeDockerLimitedCheckboxes() {
        if (!window.isDocker) {
            return;
        }
        
        $('.docker-limited-checkbox').each(function() {
            const $checkbox = $(this);
            const $input = $checkbox.find('input[type="checkbox"]');
            
            // Ensure checkbox is always checked
            $input.prop('checked', true);
            
            // Add visual disabled state
            $checkbox.addClass('disabled');
            
            // Prevent click events
            $checkbox.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Show a temporary message
                const $label = $checkbox.find('label');
                const $icon = $label.find('.service-info-icon');
                
                // Trigger the tooltip to show
                $icon.popup('show');
                
                return false;
            });
            
            // Prevent checkbox state changes
            $input.on('change', function(e) {
                e.preventDefault();
                $(this).prop('checked', true);
                return false;
            });
        });
    }
};

// Custom form validation rule to check if a string is a valid IP address
$.fn.form.settings.rules.ipaddr = function (value) {
    let result = true;
    const f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (f === null) {
        result = false;
    } else {
        for (let i = 1; i < 5; i += 1) {
            const a = f[i];
            if (a > 255) {
                result = false;
            }
        }
        if (f[5] > 32) {
            result = false;
        }
    }
    return result;
};

// Initialize the firewall form when the document is ready
$(document).ready(() => {
    firewall.initialize();
});

