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

/* global globalRootUrl, globalTranslate, firewallTooltips, FirewallAPI, UserMessage, SemanticLocalization */

/**
 * The `firewallTable` object contains methods and variables for managing the Firewall system.
 *
 * @module firewallTable
 */
const firewallTable = {
    // jQuery elements (will be initialized after DOM creation)
    $statusToggle: null,
    $addNewButton: null,
    $settings: null,
    $container: null,
    
    // Data from API
    firewallData: null,
    permissions: {
        status: true,
        modify: true,
        delete: true
    },

    // This method initializes the Firewall management interface.
    initialize() {
        // Get container
        firewallTable.$container = $('#firewall-content');
        
        // Load firewall data from REST API
        firewallTable.loadFirewallData();
    },
    
    /**
     * Load firewall data from REST API
     */
    loadFirewallData() {
        // Show loading state
        firewallTable.$container.addClass('loading');
        
        FirewallAPI.getList((response) => {
            firewallTable.$container.removeClass('loading');
            
            if (!response || !response.result) {
                UserMessage.showError(globalTranslate.fw_ErrorLoadingData);
                return;
            }
            
            // Store data
            firewallTable.firewallData = response.data;
            
            // Build the interface
            firewallTable.buildInterface(response.data);
        });
    },
    
    /**
     * Build complete interface from API data
     * @param {Object} data - Firewall data from API
     */
    buildInterface(data) {
        // Clear container
        firewallTable.$container.empty();
        
        // Build status toggle
        const statusHtml = firewallTable.buildStatusToggle(data.firewallEnabled === '1');
        firewallTable.$container.append(statusHtml);
        
        // Build settings section
        const settingsHtml = firewallTable.buildSettingsSection(data);
        firewallTable.$container.append(settingsHtml);
        
        // Cache jQuery elements
        firewallTable.$statusToggle = $('#status-toggle');
        firewallTable.$addNewButton = $('#add-new-button');
        firewallTable.$settings = $('#firewall-settings');
        
        // Initialize all UI elements
        firewallTable.initializeUIElements(data);
    },
    
    /**
     * Build status toggle HTML
     * @param {boolean} enabled - Whether firewall is enabled
     * @returns {string} HTML string
     */
    buildStatusToggle(enabled) {
        const statusClass = firewallTable.permissions.status ? '' : 'disabled';
        const labelText = enabled ? globalTranslate.fw_StatusEnabled : globalTranslate.fw_StatusDisabled;
        const checked = enabled ? 'checked' : '';
        
        return `
            <div class="ui segment">
                <div class="ui toggle checkbox ${statusClass}" id="status-toggle">
                    <input type="checkbox" name="status" id="status" ${checked}/>
                    <label>${labelText}</label>
                </div>
            </div>
        `;
    },
    
    /**
     * Build settings section with table
     * @param {Object} data - Firewall data from API
     * @returns {string} HTML string
     */
    buildSettingsSection(data) {
        let html = '<div class="ui basic segment" id="firewall-settings">';
        
        // Docker notice if applicable
        if (data.isDocker) {
            html += firewallTable.buildDockerNotice();
        }
        
        // Add new rule button
        if (firewallTable.permissions.modify) {
            html += `<a href="${globalRootUrl}firewall/modify" class="ui blue button" id="add-new-button">`;
            html += `<i class="add icon"></i> ${globalTranslate.fw_AddNewRule}</a>`;
        }
        
        // Build firewall table
        html += firewallTable.buildFirewallTable(data.items, data);
        
        html += '</div>';
        
        // Add service port info script
        html += firewallTable.buildServiceInfoScript(data);
        
        return html;
    },
    
    /**
     * Build Docker environment notice
     * @returns {string} HTML string
     */
    buildDockerNotice() {
        return `
            <div class="ui info icon message">
                <i class="info circle icon"></i>
                <div class="content">
                    <div class="header">${globalTranslate.fw_DockerEnvironmentNotice}</div>
                    <p>${globalTranslate.fw_DockerLimitedServicesInfo}</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Build firewall rules table
     * @param {Array} rules - Array of firewall rules
     * @param {Object} data - Complete data object with metadata
     * @returns {string} HTML string
     */
    buildFirewallTable(rules, data) {
        if (!rules || rules.length === 0) {
            return '<div class="ui message">' + globalTranslate.fw_NoRulesConfigured + '</div>';
        }
        
        let html = '<table class="ui selectable very basic compact unstackable table" id="firewall-table">';
        
        // Build header
        html += '<thead><tr><th></th>';
        
        // Get categories from first rule
        const categories = Object.keys(rules[0].rules || {});
        categories.forEach(category => {
            const categoryData = rules[0].rules[category];
            const isLimited = data.isDocker && !data.dockerSupportedServices.includes(categoryData.name);
            const limitedClass = isLimited ? 'docker-limited' : '';
            
            html += `<th width="20px" class="firewall-category ${limitedClass}">`;
            html += `<div><span>${categoryData.name}</span></div>`;
            html += '</th>';
        });
        
        html += '<th></th></tr></thead>';
        
        // Build body
        html += '<tbody>';
        
        rules.forEach(rule => {
            html += firewallTable.buildRuleRow(rule, categories, data);
        });
        
        html += '</tbody></table>';
        
        return html;
    },
    
    /**
     * Build single rule row
     * @param {Object} rule - Rule data
     * @param {Array} categories - Category keys
     * @param {Object} data - Complete data object
     * @returns {string} HTML string
     */
    buildRuleRow(rule, categories, data) {
        let html = `<tr class="rule-row" id="${rule.id || ''}">`;
        
        // Network and description cell
        html += '<td>';
        html += `${rule.network} - ${rule.description}`;
        if (!rule.id) {
            html += `<br><span class="features">${globalTranslate.fw_NeedConfigureRule}</span>`;
        }
        html += '</td>';
        
        // Category cells
        categories.forEach(category => {
            const categoryRule = rule.rules[category];
            if (!categoryRule) {
                html += '<td></td>';
                return;
            }
            
            const isLimited = data.isDocker && !data.dockerSupportedServices.includes(categoryRule.name);
            const limitedClass = isLimited ? 'docker-limited' : '';
            const action = categoryRule.action ? 'allow' : 'block';
            
            html += `<td class="center aligned marks ${limitedClass}" data-action="${action}" data-network="${rule.network}">`;
            html += '<i class="icons">';
            
            if (action === 'allow') {
                html += '<i class="icon checkmark green" data-value="on"></i>';
            } else if (data.firewallEnabled === '1') {
                if (isLimited) {
                    // Show as disabled firewall for blocked limited services in Docker
                    html += '<i class="icon checkmark green" data-value="off"></i>';
                    html += '<i class="icon corner close red"></i>';
                } else {
                    html += '<i class="icon close red" data-value="off"></i>';
                    html += '<i class="icon corner close red" style="display: none;"></i>';
                }
            } else {
                html += '<i class="icon checkmark green" data-value="off"></i>';
                html += '<i class="icon corner close red"></i>';
            }
            
            html += '</i></td>';
        });
        
        // Action buttons cell
        html += '<td class="right aligned collapsing">';
        html += '<div class="ui small basic icon buttons">';
        
        if (!rule.id) {
            // New rule form
            html += `<form action="${globalRootUrl}firewall/modify/" method="post">`;
            html += `<input type="hidden" name="permit" value="${rule.network}"/>`;
            html += `<input type="hidden" name="description" value="${rule.description}"/>`;
            const modifyClass = firewallTable.permissions.modify ? '' : 'disabled';
            html += `<button class="ui icon basic mini button ${modifyClass}" type="submit">`;
            html += '<i class="icon edit blue"></i></button>';
            html += '<a href="#" class="ui disabled button"><i class="icon trash red"></i></a>';
            html += '</form>';
        } else {
            // Existing rule buttons
            const modifyClass = firewallTable.permissions.modify ? '' : 'disabled';
            html += `<a href="${globalRootUrl}firewall/modify/${rule.id}" `;
            html += `class="ui button edit popuped ${modifyClass}" `;
            html += `data-content="${globalTranslate.bt_ToolTipEdit}">`;
            html += '<i class="icon edit blue"></i></a>';
            
            if (rule.permanent) {
                html += `<a href="#" class="ui disabled button"><i class="icon trash red"></i></a>`;
            } else {
                const deleteClass = firewallTable.permissions.delete ? '' : 'disabled';
                html += `<a href="#" `;
                html += `class="ui button delete two-steps-delete popuped ${deleteClass}" `;
                html += `data-value="${rule.id}" `;
                html += `data-content="${globalTranslate.bt_ToolTipDelete}">`;
                html += '<i class="icon trash red"></i></a>';
            }
        }
        
        html += '</div></td></tr>';
        
        return html;
    },
    
    /**
     * Build service info script tag
     * @param {Object} data - Firewall data
     * @returns {string} HTML string
     */
    buildServiceInfoScript(data) {
        // Collect port information from rules
        const servicePortInfo = {};
        const serviceNameMapping = {};
        
        if (data.items && data.items.length > 0) {
            const firstRule = data.items[0];
            Object.keys(firstRule.rules || {}).forEach(category => {
                const rule = firstRule.rules[category];
                servicePortInfo[category] = rule.ports || [];
                serviceNameMapping[rule.name] = category;
            });
        }
        
        return `
            <script>
                window.servicePortInfo = ${JSON.stringify(servicePortInfo)};
                window.serviceNameMapping = ${JSON.stringify(serviceNameMapping)};
                window.isDocker = ${data.isDocker ? 'true' : 'false'};
            </script>
        `;
    },
    
    /**
     * Initialize all UI elements after DOM creation
     * @param {Object} data - Firewall data for context
     */
    initializeUIElements(data) {

        // Re-bind double-click handler for dynamically created rows
        // Exclude last cell with action buttons to prevent accidental navigation on delete button clicks
        $('.rule-row td:not(:last-child)').off('dblclick').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            if (id) {
                window.location = `${globalRootUrl}firewall/modify/${id}`;
            }
        });
        
        // Let delete-something.js handle the first click, we just prevent default navigation
        $('body').on('click', 'a.delete.two-steps-delete', function(e) {
            e.preventDefault();
            // Don't stop propagation - allow delete-something.js to work
        });
        
        // Delete button handler - works with two-steps-delete logic
        // This will be triggered after delete-something.js removes the two-steps-delete class
        $('body').on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const ruleId = $button.attr('data-value');
            
            // Add loading state
            $button.addClass('loading disabled');
            
            FirewallAPI.deleteRecord(ruleId, (response) => {
                if (response.result === true) {
                    // Reload data to refresh the table
                    firewallTable.loadFirewallData();
                } else {
                    UserMessage.showMultiString(response?.messages || globalTranslate.fw_ErrorDeletingRule);
                    $button.removeClass('loading disabled');
                    // Restore two-steps-delete class if deletion failed
                    $button.addClass('two-steps-delete');
                    $button.find('i').removeClass('close').addClass('trash');
                }
            });
        });

        // Setup checkbox to enable or disable the firewall
        if (firewallTable.$statusToggle) {
            firewallTable.$statusToggle
                .checkbox({
                    onChecked: firewallTable.enableFirewall,
                    onUnchecked: firewallTable.disableFirewall,
                });
        }
        
        // Initialize popups for edit/delete buttons
        $('.popuped').popup();
        
        // Initialize Docker-specific UI elements with data context
        firewallTable.initializeDockerUI(data);
    },
    
    // Initialize Docker-specific UI elements
    initializeDockerUI(data) {
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
                const isDocker = data ? data.isDocker : window.isDocker;
                
                // Generate tooltip content using unified generator
                const tooltipContent = firewallTooltips.generateContent(
                    categoryKey,
                    action,
                    network,
                    isDocker,
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
        FirewallAPI.enable((response) => {
            if (response.result === true) {
                firewallTable.cbAfterEnabled(true);
            } else {
                firewallTable.cbAfterDisabled();
                if (response.messages) {
                    UserMessage.showMultiString(response.messages);
                }
            }
        });
    },

    // Disable the firewall by making an HTTP request to the server.
    disableFirewall() {
        FirewallAPI.disable((response) => {
            if (response.result === true) {
                firewallTable.cbAfterDisabled(true);
            } else {
                firewallTable.cbAfterEnabled();
                if (response.messages) {
                    UserMessage.showMultiString(response.messages);
                }
            }
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