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

/* global globalRootUrl, globalTranslate, firewallTooltips */

/**
 * The `firewallTable` object contains methods and variables for managing the Firewall system.
 *
 * @module firewallTable
 */
const firewallTable = {
    // The status toggle for enabling/disabling the firewall
    $statusToggle: $('#status-toggle'),

    // The button for adding a new rule
    $addNewButton: $('#add-new-button'),

    // The settings section
    $settings: $('#firewall-settings'),

    // This method initializes the Firewall management interface.
    initialize() {

        // When a user double-clicks on a rule, they will be redirected to the modify page for that rule.
        $('.rule-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}firewall/modify/${id}`;
        });

        // Setup checkbox to enable or disable the firewall.
        firewallTable.$statusToggle
            .checkbox({
                onChecked: firewallTable.enableFirewall,
                onUnchecked: firewallTable.disableFirewall,
            });
            
        // Initialize Docker-specific UI elements
        firewallTable.initializeDockerUI();
    },
    
    // Initialize Docker-specific UI elements
    initializeDockerUI() {
        // Check if we have port information
        if (!window.servicePortInfo || !window.serviceNameMapping) {
            return;
        }
        
        // Initialize tooltips for all service cells in the table
        $('td.marks').each(function() {
            const $cell = $(this);
            
            // Find service name from the header
            const columnIndex = $cell.index();
            const $headerCell = $cell.closest('table').find('thead th').eq(columnIndex);
            const serviceName = $headerCell.find('span').text() || '';
            
            if (serviceName) {
                // Get the category key from the display name
                const categoryKey = window.serviceNameMapping[serviceName] || serviceName;
                const portInfo = window.servicePortInfo[categoryKey] || [];
                const action = $cell.attr('data-action') || 'allow';
                const network = $cell.attr('data-network') || '';
                const isLimited = $cell.hasClass('docker-limited');
                
                // Generate tooltip content using unified generator
                const tooltipContent = firewallTooltips.generateContent(
                    categoryKey,
                    action,
                    network,
                    window.isDocker,
                    isLimited,
                    portInfo,
                    isDocker && isLimited // Show copy button for Docker limited services
                );
                
                // Initialize tooltip
                firewallTooltips.initializeTooltip($cell, {
                    html: tooltipContent,
                    position: 'top center'
                });
            }
        });
    },

    // Enable the firewall by making an HTTP request to the server.
    enableFirewall() {
        $.api({
            url: `${globalRootUrl}firewall/enable`,
            on: 'now',
            onSuccess(response) {
                response.success ? firewallTable.cbAfterEnabled(true) : firewallTable.cbAfterDisabled();
            },

        });
    },

    // Disable the firewall by making an HTTP request to the server.
    disableFirewall() {
        $.api({
            url: `${globalRootUrl}firewall/disable`,
            on: 'now',
            onSuccess(response) {
                response.success ? firewallTable.cbAfterDisabled(true) : firewallTable.cbAfterEnabled();
            },

        });
    },

    // Callback after the firewall has been enabled.
    cbAfterEnabled(sendEvent = false) {
        firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
        firewallTable.$statusToggle.checkbox('set checked');
        
        // For supported services, change green checkmarks to red crosses
        $('td.marks:not(.docker-limited) i.icon.checkmark.green[data-value="off"]')
            .removeClass('checkmark green')
            .addClass('close red');
        
        // For limited services in Docker, keep green checkmark but hide corner close
        $('td.docker-limited i.icon.corner.close').hide();
        
        // For all other services, hide corner close
        $('td.marks:not(.docker-limited) i.icon.corner.close').hide();

        if (sendEvent) {
            const event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
        }
    },

    // Callback after the firewall has been disabled.
    cbAfterDisabled(sendEvent = false) {
        firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
        firewallTable.$statusToggle.checkbox('set unchecked');
        
        // For all services, change red crosses to green checkmarks
        $('i.icon.close.red[data-value="off"]')
            .removeClass('close red')
            .addClass('checkmark green');
        
        // Show corner close for all services when firewall is disabled
        $('i.icon.corner.close').show();
        
        if (sendEvent) {
            const event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
        }
    },
};

// When the document is ready, initialize the Firewall management interface.
$(document).ready(() => {
    firewallTable.initialize();
});

