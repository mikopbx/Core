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
        network: {
            identifier: 'network',
            rules: [
                {
                    type: 'ipaddr',
                    prompt: globalTranslate.fw_ValidatePermitAddress,
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
        
        // Initialize Form first to enable form methods
        firewall.initializeForm();
        
        // Load firewall data from API
        firewall.loadFirewallData();
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
                UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord || 'Error loading firewall rule');
                return;
            }
            
            firewall.firewallData = response.data;
            
            // Populate form and initialize elements
            firewall.populateForm(response.data);
            
            // Initialize UI elements after data is loaded
            firewall.initializeUIElements();
            firewall.initializeTooltips();
            firewall.initializeDockerLimitedCheckboxes();
        });
    },
    
    /**
     * Populate form with firewall data.
     * @param {Object} data - Firewall data.
     */
    populateForm(data) {
        // Prepare form data object with all fields
        const formData = {
            id: data.id,
            network: data.network,
            subnet: data.subnet,
            description: data.description,
            newer_block_ip: data.newer_block_ip,
            local_network: data.local_network
        };
        
        // Add rule checkboxes to form data
        if (data.rules && typeof data.rules === 'object') {
            Object.keys(data.rules).forEach(category => {
                const fieldName = `rule_${category}`;
                // Convert action boolean to checkbox value
                formData[fieldName] = data.rules[category].action === true;
            });
        }
        
        // Use unified silent population approach
        Form.populateFormSilently(formData, {
            afterPopulate: (populatedData) => {
                // Update window variables for tooltips
                window.currentNetwork = data.network;
                window.currentSubnet = data.subnet;
                window.isDocker = data.isDocker || false;
                window.dockerSupportedServices = data.dockerSupportedServices || [];
                
                // Build service port info and name mapping from rules
                window.servicePortInfo = {};
                window.serviceNameMapping = {};
                if (data.rules && typeof data.rules === 'object') {
                    Object.keys(data.rules).forEach(category => {
                        const rule = data.rules[category];
                        window.servicePortInfo[category] = rule.ports || [];
                        // Map display name to category key
                        window.serviceNameMapping[rule.name] = category;
                    });
                }
            }
        });
    },
    
    /**
     * Initialize UI elements.
     */
    initializeUIElements() {
        // Initialize checkboxes including rules
        $('#firewall-form .checkbox').checkbox();
        $('#firewall-form .rules').checkbox();
        
        // Initialize dropdowns
        $('#firewall-form .dropdown').dropdown();
        
        // Initialize input mask for network field (IP address)
        $('input[name="network"]').inputmask({alias: 'ip', 'placeholder': '_'});
    },
    
    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        const formData = result.data || firewall.$formObj.form('get values');
        
        // Prepare rules data for API
        // Checkbox values will already be boolean thanks to convertCheckboxesToBool
        const rules = {};
        Object.keys(formData).forEach(key => {
            if (key.startsWith('rule_')) {
                const category = key.replace('rule_', '');
                // Send as boolean - backend will convert to allow/block
                rules[category] = formData[key] === true;
                delete formData[key];
            }
        });
        
        // Add rules to formData
        formData.rules = rules;
        
        // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool
        
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
        
        // Listen for checkbox changes to update tooltips
        $('#firewall-form .rules input[type="checkbox"]').on('change', function() {
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

