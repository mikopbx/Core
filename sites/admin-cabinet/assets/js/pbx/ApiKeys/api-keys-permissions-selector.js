"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var PermissionsSelector = {
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
  initialize: function initialize(containerSelector, onManualChange) {
    // Prevent duplicate initialization
    if (PermissionsSelector.initInProgress) {
      console.warn('PermissionsSelector: Initialization already in progress, skipping duplicate call');
      return;
    } // Check if already initialized with data


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
    } // Show loading state


    PermissionsSelector.$container.html('<div class="ui active centered inline loader"></div>'); // Load endpoints through OpenApiAPI

    OpenApiAPI.GetSimplifiedPermissions(PermissionsSelector.cbGetSimplifiedPermissionsSuccess, PermissionsSelector.cbGetSimplifiedPermissionsFailure);
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
  cbGetSimplifiedPermissionsSuccess: function cbGetSimplifiedPermissionsSuccess(response) {
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
  cbGetSimplifiedPermissionsFailure: function cbGetSimplifiedPermissionsFailure(response) {
    PermissionsSelector.initInProgress = false;
    var errorMessage = response.messages || globalTranslate.ak_ErrorLoadingEndpoints;
    UserMessage.showMultiString(errorMessage); // Show error state

    PermissionsSelector.$container.html('<div class="ui negative message">' + '  <i class="exclamation triangle icon"></i>' + '  ' + errorMessage + '</div>');
  },

  /**
   * Render the permissions selection UI as a table
   * Creates a table of endpoints with dropdown selectors for permissions
   */
  renderUI: function renderUI() {
    if (Object.keys(PermissionsSelector.availableEndpoints).length === 0) {
      PermissionsSelector.$container.html('<div class="ui info message">' + '  <i class="info circle icon"></i>' + '  ' + globalTranslate.ak_NoEndpointsAvailable + '</div>');
      return;
    }

    var html = "\n            <div class=\"ui info message\" style=\"margin-bottom: 1em;\">\n                <i class=\"info circle icon\"></i>\n                ".concat(globalTranslate.ak_PermissionsHelp, "\n            </div>\n            <table class=\"ui celled striped table\">\n                <thead>\n                    <tr>\n                        <th>").concat(globalTranslate.ak_PermissionTableHeaderName, "</th>\n                        <th class=\"center aligned\" style=\"width: 250px;\">").concat(globalTranslate.ak_PermissionTableHeaderAccess, "</th>\n                    </tr>\n                </thead>\n                <tbody>\n        ");
    $.each(PermissionsSelector.availableEndpoints, function (path, info) {
      var resourceId = PermissionsSelector.sanitizePathForId(path);
      var label = info.label || path;
      var description = info.description || '';
      var availableActions = info.available_actions || []; // Check if endpoint supports write operations

      var hasWriteAccess = availableActions.includes('write');
      html += "\n                <tr data-path=\"".concat(path, "\">\n                    <td>\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(label, "</div>\n                            <div class=\"description\">\n                                <small style=\"color: #767676;\"><code>").concat(path, "</code></small>\n                                ").concat(description ? "<br><small>".concat(description, "</small>") : '', "\n                            </div>\n                        </div>\n                    </td>\n                    <td class=\"center aligned\">\n                        <div class=\"ui compact selection dropdown\" id=\"permission-dropdown-").concat(resourceId, "\">\n                            <input type=\"hidden\"\n                                   name=\"permission[").concat(path, "]\"\n                                   value=\"\">\n                            <i class=\"dropdown icon\"></i>\n                            <div class=\"default text\">").concat(globalTranslate.ak_SelectPermission, "</div>\n                            <div class=\"menu\">\n                                <div class=\"item\" data-value=\"\">\n                                    <i class=\"ban icon\"></i>\n                                    ").concat(globalTranslate.ak_NoAccess, "\n                                </div>\n                                <div class=\"item\" data-value=\"read\">\n                                    <i class=\"eye icon\"></i>\n                                    ").concat(globalTranslate.ak_PermissionRead, "\n                                </div>\n                                ").concat(hasWriteAccess ? "\n                                <div class=\"item\" data-value=\"write\">\n                                    <i class=\"edit icon\"></i>\n                                    ".concat(globalTranslate.ak_PermissionWrite, "\n                                </div>\n                                ") : '', "\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            ");
    });
    html += "\n                </tbody>\n            </table>\n        ";
    PermissionsSelector.$container.html(html); // Initialize Fomantic UI dropdowns

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
  onPermissionChange: function onPermissionChange(value, text, $choice) {
    // Prevent triggering callback during programmatic sync
    if (PermissionsSelector.syncInProgress) {
      return;
    } // Notify parent component about manual change


    if (PermissionsSelector.onManualChangeCallback) {
      PermissionsSelector.onManualChangeCallback();
    } // Mark form as changed


    if (typeof Form !== 'undefined') {
      Form.dataChanged();
    }
  },

  /**
   * Set all permissions to a specific value (for full_permissions toggle)
   *
   * @param {string} permission - Permission value to set ('read', 'write', or '')
   */
  setAllPermissions: function setAllPermissions(permission) {
    PermissionsSelector.syncInProgress = true; // If setting to 'write', check each endpoint's available actions

    if (permission === 'write') {
      PermissionsSelector.$container.find('.ui.dropdown').each(function () {
        var $dropdown = $(this);
        var $tr = $dropdown.closest('tr');
        var path = $tr.attr('data-path');
        var endpointInfo = PermissionsSelector.availableEndpoints[path];
        var availableActions = (endpointInfo === null || endpointInfo === void 0 ? void 0 : endpointInfo.available_actions) || []; // Set to 'write' if available, otherwise set to max available permission (read)

        var maxPermission = availableActions.includes('write') ? 'write' : 'read';
        $dropdown.dropdown('set selected', maxPermission);
      });
    } else {
      // For 'read' or '' (noAccess), just set all dropdowns to the same value
      PermissionsSelector.$container.find('.ui.dropdown').dropdown('set selected', permission);
    }

    PermissionsSelector.syncInProgress = false;
  },

  /**
   * Sanitize path string to create valid HTML id
   *
   * @param {string} path - API path
   * @returns {string} - Sanitized id string
   */
  sanitizePathForId: function sanitizePathForId(path) {
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
  getSelectedPermissions: function getSelectedPermissions() {
    var permissions = {};
    PermissionsSelector.$container.find('input[name^="permission["]').each(function () {
      var $input = $(this);
      var name = $input.attr('name');
      var value = $input.val(); // Extract path from name: permission[/api/v3/extensions] -> /api/v3/extensions

      var match = name.match(/permission\[(.*?)\]/);

      if (match && match[1]) {
        var path = match[1]; // Only include non-empty permissions

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
  setPermissions: function setPermissions(permissions) {
    if (!permissions || _typeof(permissions) !== 'object') {
      return;
    }

    PermissionsSelector.syncInProgress = true;
    $.each(permissions, function (path, action) {
      var $input = PermissionsSelector.$container.find("input[name=\"permission[".concat(path, "]\"]"));

      if ($input.length > 0) {
        var $dropdown = $input.closest('.ui.dropdown');
        $dropdown.dropdown('set selected', action);
      }
    });
    PermissionsSelector.syncInProgress = false;
  },

  /**
   * Clear all selected permissions (set all to noAccess)
   */
  clearPermissions: function clearPermissions() {
    PermissionsSelector.setAllPermissions('');
  },

  /**
   * Check if component is initialized and ready
   *
   * @returns {boolean}
   */
  isReady: function isReady() {
    return PermissionsSelector.$container !== null && Object.keys(PermissionsSelector.availableEndpoints).length > 0;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLXBlcm1pc3Npb25zLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlBlcm1pc3Npb25zU2VsZWN0b3IiLCIkY29udGFpbmVyIiwiYXZhaWxhYmxlRW5kcG9pbnRzIiwiYWN0aW9uRGVzY3JpcHRpb25zIiwic3luY0luUHJvZ3Jlc3MiLCJvbk1hbnVhbENoYW5nZUNhbGxiYWNrIiwiaW5pdEluUHJvZ3Jlc3MiLCJpbml0aWFsaXplIiwiY29udGFpbmVyU2VsZWN0b3IiLCJvbk1hbnVhbENoYW5nZSIsImNvbnNvbGUiLCJ3YXJuIiwiaXNSZWFkeSIsIiQiLCJsZW5ndGgiLCJlcnJvciIsImh0bWwiLCJPcGVuQXBpQVBJIiwiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zIiwiY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNTdWNjZXNzIiwiY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNGYWlsdXJlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwicmVzb3VyY2VzIiwiYWN0aW9uX2Rlc2NyaXB0aW9ucyIsInJlbmRlclVJIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19FcnJvckxvYWRpbmdFbmRwb2ludHMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIk9iamVjdCIsImtleXMiLCJha19Ob0VuZHBvaW50c0F2YWlsYWJsZSIsImFrX1Blcm1pc3Npb25zSGVscCIsImFrX1Blcm1pc3Npb25UYWJsZUhlYWRlck5hbWUiLCJha19QZXJtaXNzaW9uVGFibGVIZWFkZXJBY2Nlc3MiLCJlYWNoIiwicGF0aCIsImluZm8iLCJyZXNvdXJjZUlkIiwic2FuaXRpemVQYXRoRm9ySWQiLCJsYWJlbCIsImRlc2NyaXB0aW9uIiwiYXZhaWxhYmxlQWN0aW9ucyIsImF2YWlsYWJsZV9hY3Rpb25zIiwiaGFzV3JpdGVBY2Nlc3MiLCJpbmNsdWRlcyIsImFrX1NlbGVjdFBlcm1pc3Npb24iLCJha19Ob0FjY2VzcyIsImFrX1Blcm1pc3Npb25SZWFkIiwiYWtfUGVybWlzc2lvbldyaXRlIiwiZmluZCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJvblBlcm1pc3Npb25DaGFuZ2UiLCJ2YWx1ZSIsInRleHQiLCIkY2hvaWNlIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwic2V0QWxsUGVybWlzc2lvbnMiLCJwZXJtaXNzaW9uIiwiJGRyb3Bkb3duIiwiJHRyIiwiY2xvc2VzdCIsImF0dHIiLCJlbmRwb2ludEluZm8iLCJtYXhQZXJtaXNzaW9uIiwicmVwbGFjZSIsImdldFNlbGVjdGVkUGVybWlzc2lvbnMiLCJwZXJtaXNzaW9ucyIsIiRpbnB1dCIsIm5hbWUiLCJ2YWwiLCJtYXRjaCIsInVuZGVmaW5lZCIsInNldFBlcm1pc3Npb25zIiwiYWN0aW9uIiwiY2xlYXJQZXJtaXNzaW9ucyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBRXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQU5ZOztBQVF4QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLEVBYkk7O0FBZXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLEVBbkJJOztBQXFCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLEtBekJROztBQTJCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsc0JBQXNCLEVBQUUsSUEvQkE7O0FBaUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsS0FyQ1E7O0FBdUN4QjtBQUNKO0FBQ0E7QUFDQTtB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VixDQUFtQixjQUFuQixFQUFtQ3lCLE1BQW5DO0FBQ0g7QUFDSixLQVJEO0FBVUFoRixJQUFBQSxtQkFBbUIsQ0FBQ0ksY0FBcEIsR0FBcUMsS0FBckM7QUFDSCxHQXpWdUI7O0FBMlZ4QjtBQUNKO0FBQ0E7QUFDSTZFLEVBQUFBLGdCQTlWd0IsOEJBOFZMO0FBQ2ZqRixJQUFBQSxtQkFBbUIsQ0FBQytELGlCQUFwQixDQUFzQyxFQUF0QztBQUNILEdBaFd1Qjs7QUFrV3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW5ELEVBQUFBLE9Bdld3QixxQkF1V2Q7QUFDTixXQUFPWixtQkFBbUIsQ0FBQ0MsVUFBcEIsS0FBbUMsSUFBbkMsSUFDQWdDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZbEMsbUJBQW1CLENBQUNFLGtCQUFoQyxFQUFvRFksTUFBcEQsR0FBNkQsQ0FEcEU7QUFFSDtBQTFXdUIsQ0FBNUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgT3BlbkFwaUFQSSwgRm9ybSAqL1xuXG4vKipcbiAqIFBlcm1pc3Npb25zU2VsZWN0b3IgLSBVSSBjb21wb25lbnQgZm9yIHNlbGVjdGluZyBBUEkgZW5kcG9pbnQgcGVybWlzc2lvbnNcbiAqXG4gKiBUaGlzIGNvbXBvbmVudCBwcm92aWRlcyBhbiBpbnRlcmFjdGl2ZSB0YWJsZSBmb3Igc2VsZWN0aW5nIHJlYWQvd3JpdGUgcGVybWlzc2lvbnNcbiAqIGZvciBlYWNoIFJFU1QgQVBJIGVuZHBvaW50IHdoZW4gY3JlYXRpbmcgb3IgZWRpdGluZyBBUEkga2V5cy5cbiAqXG4gKiBAbW9kdWxlIFBlcm1pc3Npb25zU2VsZWN0b3JcbiAqL1xuY29uc3QgUGVybWlzc2lvbnNTZWxlY3RvciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBjb250YWluZXIgZWxlbWVudCB3aGVyZSB0aGUgcGVybWlzc2lvbnMgdGFibGUgd2lsbCBiZSByZW5kZXJlZFxuICAgICAqIEB0eXBlIHtqUXVlcnl8bnVsbH1cbiAgICAgKi9cbiAgICAkY29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQXZhaWxhYmxlIGVuZHBvaW50cyBkYXRhIGxvYWRlZCBmcm9tIHRoZSBBUElcbiAgICAgKiBTdHJ1Y3R1cmU6IHtwYXRoOiB7bGFiZWwsIGRlc2NyaXB0aW9uLCBhdmFpbGFibGVfYWN0aW9ucywgZW5kcG9pbnRzfX1cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGF2YWlsYWJsZUVuZHBvaW50czoge30sXG5cbiAgICAvKipcbiAgICAgKiBBY3Rpb24gZGVzY3JpcHRpb25zIGZvciBVSSB0b29sdGlwc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgYWN0aW9uRGVzY3JpcHRpb25zOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wcyBpbiBzeW5jaHJvbml6YXRpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBzeW5jSW5Qcm9ncmVzczogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgbWFudWFsIHBlcm1pc3Npb24gY2hhbmdlcyAoc2V0IGJ5IHBhcmVudCBjb21wb25lbnQpXG4gICAgICogQHR5cGUge0Z1bmN0aW9ufG51bGx9XG4gICAgICovXG4gICAgb25NYW51YWxDaGFuZ2VDYWxsYmFjazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgaW5pdGlhbGl6YXRpb24gaXMgaW4gcHJvZ3Jlc3NcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpbml0SW5Qcm9ncmVzczogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwZXJtaXNzaW9ucyBzZWxlY3RvciBjb21wb25lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJTZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGhlIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25NYW51YWxDaGFuZ2UgLSBDYWxsYmFjayB3aGVuIHVzZXIgbWFudWFsbHkgY2hhbmdlcyBwZXJtaXNzaW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRpYWxpemUoJyNwZXJtaXNzaW9ucy1jb250YWluZXInLCAoKSA9PiB7XG4gICAgICogICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoY29udGFpbmVyU2VsZWN0b3IsIG9uTWFudWFsQ2hhbmdlKSB7XG4gICAgICAgIC8vIFByZXZlbnQgZHVwbGljYXRlIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRJblByb2dyZXNzKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1Blcm1pc3Npb25zU2VsZWN0b3I6IEluaXRpYWxpemF0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MsIHNraXBwaW5nIGR1cGxpY2F0ZSBjYWxsJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluaXRpYWxpemVkIHdpdGggZGF0YVxuICAgICAgICBpZiAoUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUGVybWlzc2lvbnNTZWxlY3RvcjogQWxyZWFkeSBpbml0aWFsaXplZCwgc2tpcHBpbmcgZHVwbGljYXRlIGNhbGwnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuaW5pdEluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIgPSAkKGNvbnRhaW5lclNlbGVjdG9yKTtcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5vbk1hbnVhbENoYW5nZUNhbGxiYWNrID0gb25NYW51YWxDaGFuZ2UgfHwgbnVsbDtcblxuICAgICAgICBpZiAoUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGVybWlzc2lvbnNTZWxlY3RvcjogQ29udGFpbmVyIG5vdCBmb3VuZDonLCBjb250YWluZXJTZWxlY3Rvcik7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmh0bWwoXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+J1xuICAgICAgICApO1xuXG4gICAgICAgIC8vIExvYWQgZW5kcG9pbnRzIHRocm91Z2ggT3BlbkFwaUFQSVxuICAgICAgICBPcGVuQXBpQVBJLkdldFNpbXBsaWZpZWRQZXJtaXNzaW9ucyhcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNTdWNjZXNzLFxuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5jYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc0ZhaWx1cmVcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VjY2VzcyBjYWxsYmFjayBmb3IgbG9hZGluZyBzaW1wbGlmaWVkIHBlcm1pc3Npb25zXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3BvbnNlLnJlc3VsdCAtIFN1Y2Nlc3MgZmxhZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZS5kYXRhIC0gUmVzcG9uc2UgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZS5kYXRhLnJlc291cmNlcyAtIEF2YWlsYWJsZSByZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UuZGF0YS5hY3Rpb25fZGVzY3JpcHRpb25zIC0gQWN0aW9uIGRlc2NyaXB0aW9uc1xuICAgICAqL1xuICAgIGNiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmF2YWlsYWJsZUVuZHBvaW50cyA9IHJlc3BvbnNlLmRhdGEucmVzb3VyY2VzIHx8IHt9O1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5hY3Rpb25EZXNjcmlwdGlvbnMgPSByZXNwb25zZS5kYXRhLmFjdGlvbl9kZXNjcmlwdGlvbnMgfHwge307XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnJlbmRlclVJKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmNiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zRmFpbHVyZShyZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmFpbHVyZSBjYWxsYmFjayBmb3IgbG9hZGluZyBzaW1wbGlmaWVkIHBlcm1pc3Npb25zXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2Ugd2l0aCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGNiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmFrX0Vycm9yTG9hZGluZ0VuZHBvaW50cztcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSk7XG5cbiAgICAgICAgLy8gU2hvdyBlcnJvciBzdGF0ZVxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuaHRtbChcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgbWVzc2FnZVwiPicgK1xuICAgICAgICAgICAgJyAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPicgK1xuICAgICAgICAgICAgJyAgJyArIGVycm9yTWVzc2FnZSArXG4gICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIHBlcm1pc3Npb25zIHNlbGVjdGlvbiBVSSBhcyBhIHRhYmxlXG4gICAgICogQ3JlYXRlcyBhIHRhYmxlIG9mIGVuZHBvaW50cyB3aXRoIGRyb3Bkb3duIHNlbGVjdG9ycyBmb3IgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICByZW5kZXJVSSgpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKFBlcm1pc3Npb25zU2VsZWN0b3IuYXZhaWxhYmxlRW5kcG9pbnRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lci5odG1sKFxuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JyArXG4gICAgICAgICAgICAgICAgJyAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICcgICcgKyBnbG9iYWxUcmFuc2xhdGUuYWtfTm9FbmRwb2ludHNBdmFpbGFibGUgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCIgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAxZW07XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25zSGVscH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgY2VsbGVkIHN0cmlwZWQgdGFibGVcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5ha19QZXJtaXNzaW9uVGFibGVIZWFkZXJOYW1lfTwvdGg+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiIHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25UYWJsZUhlYWRlckFjY2Vzc308L3RoPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICBgO1xuXG4gICAgICAgICQuZWFjaChQZXJtaXNzaW9uc1NlbGVjdG9yLmF2YWlsYWJsZUVuZHBvaW50cywgZnVuY3Rpb24ocGF0aCwgaW5mbykge1xuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VJZCA9IFBlcm1pc3Npb25zU2VsZWN0b3Iuc2FuaXRpemVQYXRoRm9ySWQocGF0aCk7XG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGluZm8ubGFiZWwgfHwgcGF0aDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gaW5mby5kZXNjcmlwdGlvbiB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZUFjdGlvbnMgPSBpbmZvLmF2YWlsYWJsZV9hY3Rpb25zIHx8IFtdO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBlbmRwb2ludCBzdXBwb3J0cyB3cml0ZSBvcGVyYXRpb25zXG4gICAgICAgICAgICBjb25zdCBoYXNXcml0ZUFjY2VzcyA9IGF2YWlsYWJsZUFjdGlvbnMuaW5jbHVkZXMoJ3dyaXRlJyk7XG5cbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBkYXRhLXBhdGg9XCIke3BhdGh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7bGFiZWx9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzbWFsbCBzdHlsZT1cImNvbG9yOiAjNzY3Njc2O1wiPjxjb2RlPiR7cGF0aH08L2NvZGU+PC9zbWFsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXNjcmlwdGlvbiA/IGA8YnI+PHNtYWxsPiR7ZGVzY3JpcHRpb259PC9zbWFsbD5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IHNlbGVjdGlvbiBkcm9wZG93blwiIGlkPVwicGVybWlzc2lvbi1kcm9wZG93bi0ke3Jlc291cmNlSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvblske3BhdGh9XVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3RQZXJtaXNzaW9ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJiYW4gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX05vQWNjZXNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwicmVhZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25SZWFkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtoYXNXcml0ZUFjY2VzcyA/IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwid3JpdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuYWtfUGVybWlzc2lvbldyaXRlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICBgO1xuXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lci5odG1sKGh0bWwpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9tYW50aWMgVUkgZHJvcGRvd25zXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lci5maW5kKCcudWkuZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogUGVybWlzc2lvbnNTZWxlY3Rvci5vblBlcm1pc3Npb25DaGFuZ2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBwZXJtaXNzaW9uIGRyb3Bkb3duIGNoYW5nZSBldmVudFxuICAgICAqIE5vdGlmaWVzIHBhcmVudCBjb21wb25lbnQgYWJvdXQgbWFudWFsIGNoYW5nZXNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIHBlcm1pc3Npb24gdmFsdWUgKHJlYWQvd3JpdGUvZW1wdHkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBTZWxlY3RlZCBvcHRpb24gdGV4dFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY2hvaWNlIC0galF1ZXJ5IG9iamVjdCBvZiB0aGUgc2VsZWN0ZWQgaXRlbVxuICAgICAqL1xuICAgIG9uUGVybWlzc2lvbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAvLyBQcmV2ZW50IHRyaWdnZXJpbmcgY2FsbGJhY2sgZHVyaW5nIHByb2dyYW1tYXRpYyBzeW5jXG4gICAgICAgIGlmIChQZXJtaXNzaW9uc1NlbGVjdG9yLnN5bmNJblByb2dyZXNzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3RpZnkgcGFyZW50IGNvbXBvbmVudCBhYm91dCBtYW51YWwgY2hhbmdlXG4gICAgICAgIGlmIChQZXJtaXNzaW9uc1NlbGVjdG9yLm9uTWFudWFsQ2hhbmdlQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iub25NYW51YWxDaGFuZ2VDYWxsYmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhbGwgcGVybWlzc2lvbnMgdG8gYSBzcGVjaWZpYyB2YWx1ZSAoZm9yIGZ1bGxfcGVybWlzc2lvbnMgdG9nZ2xlKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBlcm1pc3Npb24gLSBQZXJtaXNzaW9uIHZhbHVlIHRvIHNldCAoJ3JlYWQnLCAnd3JpdGUnLCBvciAnJylcbiAgICAgKi9cbiAgICBzZXRBbGxQZXJtaXNzaW9ucyhwZXJtaXNzaW9uKSB7XG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc3luY0luUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gICAgICAgIC8vIElmIHNldHRpbmcgdG8gJ3dyaXRlJywgY2hlY2sgZWFjaCBlbmRwb2ludCdzIGF2YWlsYWJsZSBhY3Rpb25zXG4gICAgICAgIGlmIChwZXJtaXNzaW9uID09PSAnd3JpdGUnKSB7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuZmluZCgnLnVpLmRyb3Bkb3duJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9ICRkcm9wZG93bi5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSAkdHIuYXR0cignZGF0YS1wYXRoJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kcG9pbnRJbmZvID0gUGVybWlzc2lvbnNTZWxlY3Rvci5hdmFpbGFibGVFbmRwb2ludHNbcGF0aF07XG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlQWN0aW9ucyA9IGVuZHBvaW50SW5mbz8uYXZhaWxhYmxlX2FjdGlvbnMgfHwgW107XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdG8gJ3dyaXRlJyBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBzZXQgdG8gbWF4IGF2YWlsYWJsZSBwZXJtaXNzaW9uIChyZWFkKVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heFBlcm1pc3Npb24gPSBhdmFpbGFibGVBY3Rpb25zLmluY2x1ZGVzKCd3cml0ZScpID8gJ3dyaXRlJyA6ICdyZWFkJztcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG1heFBlcm1pc3Npb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgJ3JlYWQnIG9yICcnIChub0FjY2VzcyksIGp1c3Qgc2V0IGFsbCBkcm9wZG93bnMgdG8gdGhlIHNhbWUgdmFsdWVcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIC5maW5kKCcudWkuZHJvcGRvd24nKVxuICAgICAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgcGVybWlzc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnN5bmNJblByb2dyZXNzID0gZmFsc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHBhdGggc3RyaW5nIHRvIGNyZWF0ZSB2YWxpZCBIVE1MIGlkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aCAtIEFQSSBwYXRoXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBTYW5pdGl6ZWQgaWQgc3RyaW5nXG4gICAgICovXG4gICAgc2FuaXRpemVQYXRoRm9ySWQocGF0aCkge1xuICAgICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJy0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGZyb20gdGhlIFVJXG4gICAgICogUmV0dXJucyBvbmx5IG5vbi1lbXB0eSBwZXJtaXNzaW9ucyAod2hlcmUgdXNlciBzZWxlY3RlZCByZWFkIG9yIHdyaXRlKVxuICAgICAqXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBPYmplY3Qgd2l0aCBwYXRoIGFzIGtleSBhbmQgcGVybWlzc2lvbiBhcyB2YWx1ZVxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gUmV0dXJuczoge1wiL2FwaS92My9leHRlbnNpb25zXCI6IFwid3JpdGVcIiwgXCIvYXBpL3YzL2NkclwiOiBcInJlYWRcIn1cbiAgICAgKiBjb25zdCBwZXJtaXNzaW9ucyA9IFBlcm1pc3Npb25zU2VsZWN0b3IuZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucygpO1xuICAgICAqL1xuICAgIGdldFNlbGVjdGVkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIGNvbnN0IHBlcm1pc3Npb25zID0ge307XG5cbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyXG4gICAgICAgICAgICAuZmluZCgnaW5wdXRbbmFtZV49XCJwZXJtaXNzaW9uW1wiXScpXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwYXRoIGZyb20gbmFtZTogcGVybWlzc2lvblsvYXBpL3YzL2V4dGVuc2lvbnNdIC0+IC9hcGkvdjMvZXh0ZW5zaW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gbmFtZS5tYXRjaCgvcGVybWlzc2lvblxcWyguKj8pXFxdLyk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBtYXRjaFsxXTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGluY2x1ZGUgbm9uLWVtcHR5IHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gJycgJiYgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbcGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwZXJtaXNzaW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHBlcm1pc3Npb25zIGluIHRoZSBVSSAodXNlZCB3aGVuIGxvYWRpbmcgZXhpc3RpbmcgQVBJIGtleSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwZXJtaXNzaW9ucyAtIE9iamVjdCB3aXRoIHBhdGggYXMga2V5IGFuZCBwZXJtaXNzaW9uIGFzIHZhbHVlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBQZXJtaXNzaW9uc1NlbGVjdG9yLnNldFBlcm1pc3Npb25zKHtcbiAgICAgKiAgIFwiL2FwaS92My9leHRlbnNpb25zXCI6IFwid3JpdGVcIixcbiAgICAgKiAgIFwiL2FwaS92My9jZHJcIjogXCJyZWFkXCJcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBzZXRQZXJtaXNzaW9ucyhwZXJtaXNzaW9ucykge1xuICAgICAgICBpZiAoIXBlcm1pc3Npb25zIHx8IHR5cGVvZiBwZXJtaXNzaW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc3luY0luUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gICAgICAgICQuZWFjaChwZXJtaXNzaW9ucywgZnVuY3Rpb24ocGF0aCwgYWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXJcbiAgICAgICAgICAgICAgICAuZmluZChgaW5wdXRbbmFtZT1cInBlcm1pc3Npb25bJHtwYXRofV1cIl1gKTtcblxuICAgICAgICAgICAgaWYgKCRpbnB1dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJGlucHV0LmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgYWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zeW5jSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgc2VsZWN0ZWQgcGVybWlzc2lvbnMgKHNldCBhbGwgdG8gbm9BY2Nlc3MpXG4gICAgICovXG4gICAgY2xlYXJQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGNvbXBvbmVudCBpcyBpbml0aWFsaXplZCBhbmQgcmVhZHlcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzUmVhZHkoKSB7XG4gICAgICAgIHJldHVybiBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKFBlcm1pc3Npb25zU2VsZWN0b3IuYXZhaWxhYmxlRW5kcG9pbnRzKS5sZW5ndGggPiAwO1xuICAgIH1cbn07XG4iXX0=