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

/* global $, globalTranslate, UserMessage, OpenApiAPI, Form */

/**
 * PermissionsSelector - UI component for selecting API endpoint permissions
 *
 * This component provides an interactive table for selecting read/write permissions
 * for each REST API endpoint when creating or editing API keys.
 *
 * @module PermissionsSelector
 */
const PermissionsSelector = {

    /**
     * jQuery container element where the permissions table will be rendered
     * @type {jQuery|null}
     */
    $container: null,

    /**
     * Available endpoints data loaded from the API
     * Structure: {path: {label, description, available_actions, endpoints}}
     * @type {Object}
     */
    availableEndpoints: {},

    /**
     * Action descriptions for UI tooltips
     * @type {Object}
     */
    actionDescriptions: {},

    /**
     * Flag to prevent infinite loops in synchronization
     * @type {boolean}
     */
    syncInProgress: false,

    /**
     * Callback for manual permission changes (set by parent component)
     * @type {Function|null}
     */
    onManualChangeCallback: null,

    /**
     * Flag to track if initialization is in progress
     * @type {boolean}
     */
    initInProgress: false,

    /**
     * Initialize the permissions selector component
     *
     * @param {string} containerSelector - CSS selector for the container element
     * @param {Function} onManualChange - Callback when user manually changes permission
     * @example
     * PermissionsSelector.initialize('#permissions-container', () => {
     *   $('#full-permissions-toggle').checkbox('uncheck');
     * });
     */
    initialize(containerSelector, onManualChange) {
        // Prevent duplicate initialization
        if (PermissionsSelector.initInProgress) {
            console.warn('PermissionsSelector: Initialization already in progress, skipping duplicate call');
            return;
        }

        // Check if already initialized with data
        if (PermissionsSelector.isReady()) {
            console.warn('PermissionsSelector: Already initialized, skipping duplicate call');
            return;
        }

        PermissionsSelector.initInProgress = true;
        PermissionsSelector.$container = $(containerSelector);
        PermissionsSelector.onManualChangeCallback = onManualChange || null;

        if (PermissionsSelector.$container.length === 0) {
            console.error('PermissionsSelector: Container not found:', containerSelector);
            PermissionsSelector.initInProgress = false;
            return;
        }

        // Show loading state
        PermissionsSelector.$container.html(
            '<div class="ui active centered inline loader"></div>'
        );

        // Load endpoints through OpenApiAPI
        OpenApiAPI.GetSimplifiedPermissions(
            PermissionsSelector.cbGetSimplifiedPermissionsSuccess,
            PermissionsSelector.cbGetSimplifiedPermissionsFailure
        );
    },

    /**
     * Success callback for loading simplified permissions
     *
     * @param {Object} response - API response
     * @param {boolean} response.result - Success flag
     * @param {Object} response.data - Response data
     * @param {Object} response.data.resources - Available resources
     * @param {Object} response.data.action_descriptions - Action descriptions
     */
    cbGetSimplifiedPermissionsSuccess(response) {
        PermissionsSelector.initInProgress = false;

        if (response.result === true && response.data) {
            PermissionsSelector.availableEndpoints = response.data.resources || {};
            PermissionsSelector.actionDescriptions = response.data.action_descriptions || {};
            PermissionsSelector.renderUI();
        } else {
            PermissionsSelector.cbGetSimplifiedPermissionsFailure(response);
        }
    },

    /**
     * Failure callback for loading simplified permissions
     *
     * @param {Object} response - API response with error information
     */
    cbGetSimplifiedPermissionsFailure(response) {
        PermissionsSelector.initInProgress = false;

        const errorMessage = response.messages || globalTranslate.ak_ErrorLoadingEndpoints;
        UserMessage.showMultiString(errorMessage);

        // Show error state
        PermissionsSelector.$container.html(
            '<div class="ui negative message">' +
            '  <i class="exclamation triangle icon"></i>' +
            '  ' + errorMessage +
            '</div>'
        );
    },

    /**
     * Render the permissions selection UI as a table
     * Creates a table of endpoints with dropdown selectors for permissions
     */
    renderUI() {
        if (Object.keys(PermissionsSelector.availableEndpoints).length === 0) {
            PermissionsSelector.$container.html(
                '<div class="ui info message">' +
                '  <i class="info circle icon"></i>' +
                '  ' + globalTranslate.ak_NoEndpointsAvailable +
                '</div>'
            );
            return;
        }

        let html = `
            <div class="ui info message" style="margin-bottom: 1em;">
                <i class="info circle icon"></i>
                ${globalTranslate.ak_PermissionsHelp}
            </div>
            <table class="ui celled striped table">
                <thead>
                    <tr>
                        <th>${globalTranslate.ak_PermissionTableHeaderName}</th>
                        <th class="center aligned" style="width: 250px;">${globalTranslate.ak_PermissionTableHeaderAccess}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        $.each(PermissionsSelector.availableEndpoints, function(path, info) {
            const resourceId = PermissionsSelector.sanitizePathForId(path);
            const label = info.label || path;
            const description = info.description || '';
            const availableActions = info.available_actions || [];

            // Check if endpoint supports write operations
            const hasWriteAccess = availableActions.includes('write');

            html += `
                <tr data-path="${path}">
                    <td>
                        <div class="content">
                            <div class="header">${label}</div>
                            <div class="description">
                                <small style="color: #767676;"><code>${path}</code></small>
                                ${description ? `<br><small>${description}</small>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="center aligned">
                        <div class="ui compact selection dropdown" id="permission-dropdown-${resourceId}">
                            <input type="hidden"
                                   name="permission[${path}]"
                                   value="">
                            <i class="dropdown icon"></i>
                            <div class="default text">${globalTranslate.ak_SelectPermission}</div>
                            <div class="menu">
                                <div class="item" data-value="">
                                    <i class="ban icon"></i>
                                    ${globalTranslate.ak_NoAccess}
                                </div>
                                <div class="item" data-value="read">
                                    <i class="eye icon"></i>
                                    ${globalTranslate.ak_PermissionRead}
                                </div>
                                ${hasWriteAccess ? `
                                <div class="item" data-value="write">
                                    <i class="edit icon"></i>
                                    ${globalTranslate.ak_PermissionWrite}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        PermissionsSelector.$container.html(html);

        // Initialize Fomantic UI dropdowns
        PermissionsSelector.$container.find('.ui.dropdown').dropdown({
            onChange: PermissionsSelector.onPermissionChange
        });
    },

    /**
     * Handle permission dropdown change event
     * Notifies parent component about manual changes
     *
     * @param {string} value - Selected permission value (read/write/empty)
     * @param {string} text - Selected option text
     * @param {jQuery} $choice - jQuery object of the selected item
     */
    onPermissionChange(value, text, $choice) {
        // Prevent triggering callback during programmatic sync
        if (PermissionsSelector.syncInProgress) {
            return;
        }

        // Notify parent component about manual change
        if (PermissionsSelector.onManualChangeCallback) {
            PermissionsSelector.onManualChangeCallback();
        }

        // Mark form as changed
        if (typeof Form !== 'undefined') {
            Form.dataChanged();
        }
    },

    /**
     * Set all permissions to a specific value (for full_permissions toggle)
     *
     * @param {string} permission - Permission value to set ('read', 'write', or '')
     */
    setAllPermissions(permission) {
        PermissionsSelector.syncInProgress = true;

        // If setting to 'write', check each endpoint's available actions
        if (permission === 'write') {
            PermissionsSelector.$container.find('.ui.dropdown').each(function() {
                const $dropdown = $(this);
                const $tr = $dropdown.closest('tr');
                const path = $tr.attr('data-path');
                const endpointInfo = PermissionsSelector.availableEndpoints[path];
                const availableActions = endpointInfo?.available_actions || [];

                // Set to 'write' if available, otherwise set to max available permission (read)
                const maxPermission = availableActions.includes('write') ? 'write' : 'read';
                $dropdown.dropdown('set selected', maxPermission);
            });
        } else {
            // For 'read' or '' (noAccess), just set all dropdowns to the same value
            PermissionsSelector.$container
                .find('.ui.dropdown')
                .dropdown('set selected', permission);
        }

        PermissionsSelector.syncInProgress = false;
    },

    /**
     * Sanitize path string to create valid HTML id
     *
     * @param {string} path - API path
     * @returns {string} - Sanitized id string
     */
    sanitizePathForId(path) {
        return path.replace(/[^a-zA-Z0-9]/g, '-');
    },

    /**
     * Get selected permissions from the UI
     * Returns only non-empty permissions (where user selected read or write)
     *
     * @returns {Object} - Object with path as key and permission as value
     * @example
     * // Returns: {"/api/v3/extensions": "write", "/api/v3/cdr": "read"}
     * const permissions = PermissionsSelector.getSelectedPermissions();
     */
    getSelectedPermissions() {
        const permissions = {};

        PermissionsSelector.$container
            .find('input[name^="permission["]')
            .each(function() {
                const $input = $(this);
                const name = $input.attr('name');
                const value = $input.val();

                // Extract path from name: permission[/api/v3/extensions] -> /api/v3/extensions
                const match = name.match(/permission\[(.*?)\]/);
                if (match && match[1]) {
                    const path = match[1];

                    // Only include non-empty permissions
                    if (value !== '' && value !== null && value !== undefined) {
                        permissions[path] = value;
                    }
                }
            });

        return permissions;
    },

    /**
     * Set permissions in the UI (used when loading existing API key)
     *
     * @param {Object} permissions - Object with path as key and permission as value
     * @example
     * PermissionsSelector.setPermissions({
     *   "/api/v3/extensions": "write",
     *   "/api/v3/cdr": "read"
     * });
     */
    setPermissions(permissions) {
        if (!permissions || typeof permissions !== 'object') {
            return;
        }

        PermissionsSelector.syncInProgress = true;

        $.each(permissions, function(path, action) {
            const $input = PermissionsSelector.$container
                .find(`input[name="permission[${path}]"]`);

            if ($input.length > 0) {
                const $dropdown = $input.closest('.ui.dropdown');
                $dropdown.dropdown('set selected', action);
            }
        });

        PermissionsSelector.syncInProgress = false;
    },

    /**
     * Clear all selected permissions (set all to noAccess)
     */
    clearPermissions() {
        PermissionsSelector.setAllPermissions('');
    },

    /**
     * Check if component is initialized and ready
     *
     * @returns {boolean}
     */
    isReady() {
        return PermissionsSelector.$container !== null &&
               Object.keys(PermissionsSelector.availableEndpoints).length > 0;
    }
};
