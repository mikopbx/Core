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

/* global globalRootUrl,globalTranslate, Form, firewallTooltips */

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
        $('#firewall-form .rules,#firewall-form .checkbox').checkbox();
        $('#firewall-form .dropdown').dropdown();

        firewall.initializeForm();
        firewall.initializeTooltips();
        firewall.initializeDockerLimitedCheckboxes();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = firewall.$formObj.form('get values');
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
        Form.$formObj = firewall.$formObj;
        Form.url = `${globalRootUrl}firewall/save`; // Form submission URL
        Form.validateRules = firewall.validateRules; // Form validation rules
        Form.cbBeforeSendForm = firewall.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = firewall.cbAfterSendForm; // Callback after form is sent
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
            
            // Initialize tooltip
            firewallTooltips.initializeTooltip($icon, {
                html: tooltipContent,
                position: 'top right'
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
                
                // Update tooltip
                firewallTooltips.updateContent($specialIcon, newContent);
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

