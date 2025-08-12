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

/* global globalRootUrl, globalTranslate, AsteriskManagersAPI, SecurityUtils, PbxDataTableIndex, TooltipBuilder */

/**
 * Object for managing Asterisk managers table using PbxDataTableIndex
 *
 * @module asteriskManagersIndex
 */
const asteriskManagersIndex = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the object
     */
    initialize() {
        // Initialize event handlers once (using delegation)
        this.initializeTableEvents();
        
        // Initialize the Asterisk managers table with REST API
        this.initializeDataTable();
    },
    
    /**
     * Initialize DataTable using custom table rendering
     */
    initializeDataTable() {
        // Load data and render custom table
        this.loadAndRenderTable();
    },

    /**
     * Load data and render custom table
     */
    loadAndRenderTable() {
        // Show loading state
        $('#asterisk-managers-table-container').html('<div class="ui active centered inline loader"></div>');
        
        // Load data from API
        AsteriskManagersAPI.getList((data) => {
            if (data && Array.isArray(data)) {
                if (data.length === 0) {
                    // Hide the table container and add button, show placeholder
                    $('#asterisk-managers-table-container').hide();
                    $('.add-new-button').hide();
                    $('#empty-table-placeholder').show();
                } else {
                    // Show the table container and add button, hide placeholder
                    $('#empty-table-placeholder').hide();
                    $('.add-new-button').show();
                    $('#asterisk-managers-table-container').show();
                    
                    this.renderPermissionsTable(data);
                }
            } else {
                $('#asterisk-managers-table-container').html('<div class="ui error message">Failed to load data</div>');
            }
        }, false); // Don't use cache for now
    },
    
    
    /**
     * Render custom permissions table
     * @param {Array} managers - Array of manager objects
     */
    renderPermissionsTable(managers) {
        const permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
                            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'];
        
        
        let tableHtml = `
            <table class="ui selectable very basic compact unstackable table" id="asterisk-managers-table">
                <thead>
                    <tr>
                        <th></th>
                        ${permissions.map(perm => `
                            <th width="20px" class="permission-category hide-on-mobile">
                                <div><span>${perm}</span></div>
                            </th>
                        `).join('')}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Render rows
        managers.forEach(manager => {
            const readPerms = manager.readPermissionsSummary || '';
            const writePerms = manager.writePermissionsSummary || '';
            const systemIcon = manager.isSystem ? '<i class="yellow lock icon"></i> ' : '';
            
            // Format description like in Firewall
            const description = manager.description || '';
            const descriptionText = description ? ` - ${description}` : '';
            
            tableHtml += `
                <tr class="manager-row" data-id="${manager.id}">
                    <td>
                        ${systemIcon}
                        <i class="blue asterisk icon"></i> 
                        <strong>${window.SecurityUtils.escapeHtml(manager.username)}</strong>${window.SecurityUtils.escapeHtml(descriptionText)}
                    </td>
            `;
            
            // Add permission cells - show checkmark if has any permission (read or write)
            permissions.forEach(perm => {
                const hasRead = readPerms === 'all' || readPerms.includes(perm);
                const hasWrite = writePerms === 'all' || writePerms.includes(perm);
                const hasPermission = hasRead || hasWrite;
                
                if (hasPermission) {
                    // Add data attributes for dynamic tooltip initialization
                    tableHtml += `<td class="center aligned permission-cell hide-on-mobile" 
                        data-manager="${window.SecurityUtils.escapeHtml(manager.username)}"
                        data-permission="${perm}"
                        data-is-system="${manager.isSystem}"
                        data-has-read="${hasRead}"
                        data-has-write="${hasWrite}">`;
                    
                    // Use text labels with colors (no inline tooltip data)
                    if (hasRead && hasWrite) {
                        // Full access (both read and write)
                        tableHtml += '<span class="ui green text"><strong>RW</strong></span>';
                    } else if (hasRead) {
                        // Read only
                        tableHtml += '<span class="ui blue text"><strong>R</strong></span>';
                    } else if (hasWrite) {
                        // Write only
                        tableHtml += '<span class="ui orange text"><strong>W</strong></span>';
                    }
                } else {
                    // No permission - empty cell without tooltip
                    tableHtml += '<td class="center aligned permission-cell hide-on-mobile">';
                }
                
                tableHtml += '</td>';
            });
            
            // Add action buttons
            tableHtml += `
                <td class="right aligned collapsing">
                    <div class="ui tiny basic icon buttons action-buttons">
            `;
            
            if (manager.isSystem) {
                tableHtml += `
                    <a href="${globalRootUrl}asterisk-managers/modify/${manager.id}" 
                       class="ui button view popuped" data-content="${globalTranslate.bt_View || 'View'}">
                        <i class="icon eye blue"></i>
                    </a>
                `;
            } else {
                tableHtml += `
                    <a href="${globalRootUrl}asterisk-managers/modify/${manager.id}" 
                       class="ui button edit popuped" data-content="${globalTranslate.bt_ToolTipEdit || 'Edit'}">
                        <i class="icon edit blue"></i>
                    </a>
                    <a href="#" data-value="${manager.id}" 
                       class="ui button copy popuped" data-content="${globalTranslate.bt_ToolTipCopy || 'Copy'}">
                        <i class="icon copy outline blue"></i>
                    </a>
                    <a href="#" data-value="${manager.id}" 
                       class="ui button delete two-steps-delete popuped" data-content="${globalTranslate.bt_ToolTipDelete || 'Delete'}">
                        <i class="icon trash red"></i>
                    </a>
                `;
            }
            
            tableHtml += `
                    </div>
                </td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
        `;
        
        // Render table
        $('#asterisk-managers-table-container').html(tableHtml);
        
        // Initialize tooltips dynamically like in Firewall
        this.initializePermissionTooltips();
    },
    
    /**
     * Initialize permission tooltips dynamically
     */
    initializePermissionTooltips() {
        const permissionDescriptions = this.getPermissionDescriptions();
        
        // Initialize tooltips for all permission cells
        $('.permission-cell[data-manager]').each(function() {
            const $cell = $(this);
            const manager = $cell.data('manager');
            const permission = $cell.data('permission');
            const isSystem = $cell.data('is-system');
            const hasRead = $cell.data('has-read');
            const hasWrite = $cell.data('has-write');
            
            if (manager && permission && permissionDescriptions[permission]) {
                const tooltipData = asteriskManagersIndex.buildTooltipData(
                    manager, permission, isSystem, hasRead, hasWrite, permissionDescriptions[permission]
                );
                
                const tooltipContent = TooltipBuilder.buildContent(tooltipData);
                
                // Initialize tooltip
                $cell.popup({
                    html: tooltipContent,
                    position: 'top center',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    },
                    variation: 'flowing'
                });
            }
        });
    },
    
    /**
     * Get permission descriptions object
     */
    getPermissionDescriptions() {
        return {
            call: {
                read: globalTranslate.am_tooltip_call_read || 'View active calls and channel states',
                write: globalTranslate.am_tooltip_call_write || 'Hangup calls, transfer, park'
            },
            cdr: {
                read: globalTranslate.am_tooltip_cdr_read || 'Access call detail records',
                write: globalTranslate.am_tooltip_cdr_write || 'Modify CDR records'
            },
            originate: {
                read: globalTranslate.am_tooltip_originate_read || 'View origination status',
                write: globalTranslate.am_tooltip_originate_write || 'Create new calls, initiate outbound calls'
            },
            reporting: {
                read: globalTranslate.am_tooltip_reporting_read || 'Access system reports and statistics',
                write: globalTranslate.am_tooltip_reporting_write || 'Generate and export reports'
            },
            agent: {
                read: globalTranslate.am_tooltip_agent_read || 'View queue agents status',
                write: globalTranslate.am_tooltip_agent_write || 'Login/logout agents, pause/unpause'
            },
            config: {
                read: globalTranslate.am_tooltip_config_read || 'View configuration files',
                write: globalTranslate.am_tooltip_config_write || 'Modify system configuration, reload modules'
            },
            dialplan: {
                read: globalTranslate.am_tooltip_dialplan_read || 'View dialplan contexts and extensions',
                write: globalTranslate.am_tooltip_dialplan_write || 'Modify dialplan in real-time'
            },
            dtmf: {
                read: globalTranslate.am_tooltip_dtmf_read || 'Monitor DTMF events',
                write: globalTranslate.am_tooltip_dtmf_write || 'Send DTMF tones to channels'
            },
            log: {
                read: globalTranslate.am_tooltip_log_read || 'View system and application logs',
                write: globalTranslate.am_tooltip_log_write || 'Rotate logs, change log levels'
            },
            system: {
                read: globalTranslate.am_tooltip_system_read || 'View system status and information',
                write: globalTranslate.am_tooltip_system_write || 'Execute system commands, restart services'
            },
            user: {
                read: globalTranslate.am_tooltip_user_read || 'View user events and device states',
                write: globalTranslate.am_tooltip_user_write || 'Send user events, update device states'
            },
            verbose: {
                read: globalTranslate.am_tooltip_verbose_read || 'View verbose messages and debug output',
                write: globalTranslate.am_tooltip_verbose_write || 'Set verbose levels'
            },
            command: {
                read: globalTranslate.am_tooltip_command_read || 'View CLI command output',
                write: globalTranslate.am_tooltip_command_write || 'Execute Asterisk CLI commands'
            }
        };
    },
    
    /**
     * Build tooltip data structure
     */
    buildTooltipData(manager, permission, isSystem, hasRead, hasWrite, permDesc) {
        const tooltipData = {
            header: `${manager} - ${permission.toUpperCase()}`,
            description: null,
            list: []
        };
        
        // Add current access level
        let accessLevel = '';
        let accessColor = '';
        if (hasRead && hasWrite) {
            accessLevel = globalTranslate.am_tooltip_access_read_write || 'Read/Write';
            accessColor = 'green';
        } else if (hasRead) {
            accessLevel = globalTranslate.am_tooltip_access_read_only || 'Read Only';
            accessColor = 'blue';
        } else if (hasWrite) {
            accessLevel = globalTranslate.am_tooltip_access_write_only || 'Write Only';
            accessColor = 'orange';
        }
        
        const currentAccessLabel = globalTranslate.am_tooltip_current_access || 'Current Access';
        tooltipData.description = `<span class="ui ${accessColor} text"><strong>${currentAccessLabel}: ${accessLevel}</strong></span>`;
        
        // Add permission details
        const allowedOperationsLabel = globalTranslate.am_tooltip_allowed_operations || 'Allowed Operations';
        tooltipData.list.push({
            term: allowedOperationsLabel,
            definition: null
        });
        
        if (hasRead) {
            const readLabel = globalTranslate.am_Read || 'Read';
            tooltipData.list.push({
                term: readLabel,
                definition: permDesc.read
            });
        }
        
        if (hasWrite) {
            const writeLabel = globalTranslate.am_Write || 'Write';
            tooltipData.list.push({
                term: writeLabel,
                definition: permDesc.write
            });
        }
        
        // Add restrictions if any
        if (!hasRead || !hasWrite) {
            const restrictionsLabel = globalTranslate.am_tooltip_restrictions || 'Restrictions';
            tooltipData.list.push({
                term: restrictionsLabel,
                definition: null
            });
            
            if (!hasRead) {
                const cannotReadLabel = globalTranslate.am_tooltip_cannot_read || 'Cannot read';
                tooltipData.list.push(`${cannotReadLabel}: ${permDesc.read}`);
            }
            if (!hasWrite) {
                const cannotWriteLabel = globalTranslate.am_tooltip_cannot_write || 'Cannot write';
                tooltipData.list.push(`${cannotWriteLabel}: ${permDesc.write}`);
            }
        }
        
        // Add system manager warning if applicable
        if (isSystem) {
            tooltipData.warning = {
                header: globalTranslate.am_tooltip_system_manager_warning || 'System Manager',
                text: globalTranslate.am_tooltip_system_manager_warning_text || 'This is a system manager account. Modifying permissions may affect system operations.'
            };
        }
        
        return tooltipData;
    },
    
    /**
     * Initialize table event handlers
     */
    initializeTableEvents() {
        // Use event delegation for dynamically generated content
        const $container = $('#asterisk-managers-table-container');
        
        // Double click to edit (exclude action buttons column)
        $container.on('dblclick', '.manager-row td:not(.right.aligned)', (e) => {
            const id = $(e.target).closest('tr').attr('data-id');
            if (id) {
                window.location = `${globalRootUrl}asterisk-managers/modify/${id}`;
            }
        });
        
        // Copy button handler
        $container.on('click', 'a.copy', (e) => {
            e.preventDefault();
            const id = $(e.currentTarget).attr('data-value');
            
            if (id) {
                // Redirect to modify page with copy-source parameter
                window.location = `${globalRootUrl}asterisk-managers/modify?copy-source=${id}`;
            }
        });
        
        // Let delete-something.js handle the first click, we just prevent default navigation
        $container.on('click', 'a.delete.two-steps-delete', function(e) {
            e.preventDefault();
            // Don't stop propagation - allow delete-something.js to work
        });
        
        // Delete button handler - works with two-steps-delete logic
        // This will be triggered after delete-something.js removes the two-steps-delete class
        $container.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const id = $button.attr('data-value');
            
            if (id) {
                $button.addClass('loading disabled');
                AsteriskManagersAPI.deleteRecord(id, (response) => {
                    if (response && response.result === true) {
                        // Reload the entire page to ensure clean state
                        window.location.href = `${globalRootUrl}asterisk-managers/index`;
                    } else {
                        UserMessage.showMultiString(response?.messages || globalTranslate.am_ErrorDeletingManager || 'Error deleting manager');
                        $button.removeClass('loading disabled');
                        // Restore two-steps-delete class if deletion failed
                        $button.addClass('two-steps-delete');
                        $button.find('i').removeClass('close').addClass('trash');
                    }
                });
            }
        });
    },

    /**
     * Callback after data is loaded
     * @param {Array} data - Array of manager objects
     */
    onDataLoaded(data) {
        // Additional processing after data load if needed
    }
};

/**
 * Initialize Asterisk Managers table on document ready
 */
$(document).ready(() => {
    asteriskManagersIndex.initialize();
});