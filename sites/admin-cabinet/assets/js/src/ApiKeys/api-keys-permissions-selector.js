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

/* global $, globalTranslate, UserMessage, OpenApiAPI */

/**
 * PermissionsSelector - UI component for selecting API endpoint permissions
 *
 * This component provides an interactive UI for selecting read/write permissions
 * for each REST API endpoint when creating or editing API keys.
 *
 * @module PermissionsSelector
 */
const PermissionsSelector = {

    /**
     * jQuery container element where the permissions UI will be rendered
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
     * Initialize the permissions selector component
     *
     * @param {string} containerSelector - CSS selector for the container element
     * @example
     * PermissionsSelector.initialize('#permissions-container');
     */
    initialize(containerSelector) {
        PermissionsSelector.$container = $(containerSelector);

        if (PermissionsSelector.$container.length === 0) {
            console.error('PermissionsSelector: Container not found:', containerSelector);
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
     * Render the permissions selection UI
     * Creates a list of endpoints with dropdown selectors for permissions
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

        let html = '<div class="ui middle aligned divided list">';

        $.each(PermissionsSelector.availableEndpoints, function(path, info) {
            const resourceId = PermissionsSelector.sanitizePathForId(path);

            html += `
                <div class="item" data-path="${path}">
                    <div class="right floated content">
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
                                <div class="item" data-value="write">
                                    <i class="edit icon"></i>
                                    ${globalTranslate.ak_PermissionWrite}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="content">
                        <div class="header">${info.label || path}</div>
                        <div class="description">
                            <small class="ui grey text">${path}</small>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        PermissionsSelector.$container.html(html);

        // Initialize Fomantic UI dropdowns
        PermissionsSelector.$container.find('.ui.dropdown').dropdown({
            onChange: PermissionsSelector.onPermissionChange
        });
    },

    /**
     * Handle permission dropdown change event
     *
     * @param {string} value - Selected permission value (read/write/empty)
     * @param {string} text - Selected option text
     * @param {jQuery} $choice - jQuery object of the selected item
     */
    onPermissionChange(value, text, $choice) {
        // Can be used for validation or real-time feedback
        // Currently just allows the change
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

        $.each(permissions, function(path, action) {
            const $input = PermissionsSelector.$container
                .find(`input[name="permission[${path}]"]`);

            if ($input.length > 0) {
                const $dropdown = $input.closest('.ui.dropdown');
                $dropdown.dropdown('set selected', action);
            }
        });
    },

    /**
     * Clear all selected permissions
     */
    clearPermissions() {
        PermissionsSelector.$container
            .find('.ui.dropdown')
            .dropdown('clear');
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
