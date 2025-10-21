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
    PermissionsSelector.$container = $(containerSelector);
    PermissionsSelector.onManualChangeCallback = onManualChange || null;

    if (PermissionsSelector.$container.length === 0) {
      console.error('PermissionsSelector: Container not found:', containerSelector);
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

    var html = "\n            <table class=\"ui celled striped table\">\n                <thead>\n                    <tr>\n                        <th>".concat(globalTranslate.ak_PermissionTableHeaderName, "</th>\n                        <th>").concat(globalTranslate.ak_PermissionTableHeaderURI, "</th>\n                        <th class=\"center aligned\" style=\"width: 250px;\">").concat(globalTranslate.ak_PermissionTableHeaderAccess, "</th>\n                    </tr>\n                </thead>\n                <tbody>\n        ");
    $.each(PermissionsSelector.availableEndpoints, function (path, info) {
      var resourceId = PermissionsSelector.sanitizePathForId(path);
      var label = info.label || path;
      var description = info.description || '';
      html += "\n                <tr data-path=\"".concat(path, "\">\n                    <td>\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(label, "</div>\n                            ").concat(description ? "<div class=\"description\"><small>".concat(description, "</small></div>") : '', "\n                        </div>\n                    </td>\n                    <td>\n                        <code>").concat(path, "</code>\n                    </td>\n                    <td class=\"center aligned\">\n                        <div class=\"ui compact selection dropdown\" id=\"permission-dropdown-").concat(resourceId, "\">\n                            <input type=\"hidden\"\n                                   name=\"permission[").concat(path, "]\"\n                                   value=\"\">\n                            <i class=\"dropdown icon\"></i>\n                            <div class=\"default text\">").concat(globalTranslate.ak_SelectPermission, "</div>\n                            <div class=\"menu\">\n                                <div class=\"item\" data-value=\"\">\n                                    <i class=\"ban icon\"></i>\n                                    ").concat(globalTranslate.ak_NoAccess, "\n                                </div>\n                                <div class=\"item\" data-value=\"read\">\n                                    <i class=\"eye icon\"></i>\n                                    ").concat(globalTranslate.ak_PermissionRead, "\n                                </div>\n                                <div class=\"item\" data-value=\"write\">\n                                    <i class=\"edit icon\"></i>\n                                    ").concat(globalTranslate.ak_PermissionWrite, "\n                                </div>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            ");
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
    PermissionsSelector.syncInProgress = true;
    PermissionsSelector.$container.find('.ui.dropdown').dropdown('set selected', permission);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLXBlcm1pc3Npb25zLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlBlcm1pc3Npb25zU2VsZWN0b3IiLCIkY29udGFpbmVyIiwiYXZhaWxhYmxlRW5kcG9pbnRzIiwiYWN0aW9uRGVzY3JpcHRpb25zIiwic3luY0luUHJvZ3Jlc3MiLCJvbk1hbnVhbENoYW5nZUNhbGxiYWNrIiwiaW5pdGlhbGl6ZSIsImNvbnRhaW5lclNlbGVjdG9yIiwib25NYW51YWxDaGFuZ2UiLCIkIiwibGVuZ3RoIiwiY29uc29sZSIsImVycm9yIiwiaHRtbCIsIk9wZW5BcGlBUEkiLCJHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnMiLCJjYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc1N1Y2Nlc3MiLCJjYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc0ZhaWx1cmUiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJyZXNvdXJjZXMiLCJhY3Rpb25fZGVzY3JpcHRpb25zIiwicmVuZGVyVUkiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX0Vycm9yTG9hZGluZ0VuZHBvaW50cyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiT2JqZWN0Iiwia2V5cyIsImFrX05vRW5kcG9pbnRzQXZhaWxhYmxlIiwiYWtfUGVybWlzc2lvblRhYmxlSGVhZGVyTmFtZSIsImFrX1Blcm1pc3Npb25UYWJsZUhlYWRlclVSSSIsImFrX1Blcm1pc3Npb25UYWJsZUhlYWRlckFjY2VzcyIsImVhY2giLCJwYXRoIiwiaW5mbyIsInJlc291cmNlSWQiLCJzYW5pdGl6ZVBhdGhGb3JJZCIsImxhYmVsIiwiZGVzY3JpcHRpb24iLCJha19TZWxlY3RQZXJtaXNzaW9uIiwiYWtfTm9BY2Nlc3MiLCJha19QZXJtaXNzaW9uUmVhZCIsImFrX1Blcm1pc3Npb25Xcml0ZSIsImZpbmQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwib25QZXJtaXNzaW9uQ2hhbmdlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsInNldEFsbFBlcm1pc3Npb25zIiwicGVybWlzc2lvbiIsInJlcGxhY2UiLCJnZXRTZWxlY3RlZFBlcm1pc3Npb25zIiwicGVybWlzc2lvbnMiLCIkaW5wdXQiLCJuYW1lIiwiYXR0ciIsInZhbCIsIm1hdGNoIiwidW5kZWZpbmVkIiwic2V0UGVybWlzc2lvbnMiLCJhY3Rpb24iLCIkZHJvcGRvd24iLCJjbG9zZXN0IiwiY2xlYXJQZXJtaXNzaW9ucyIsImlzUmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUV4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFOWTs7QUFReEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxFQWJJOztBQWV4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxFQW5CSTs7QUFxQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxLQXpCUTs7QUEyQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHNCQUFzQixFQUFFLElBL0JBOztBQWlDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUEzQ3dCLHNCQTJDYkMsaUJBM0NhLEVBMkNNQyxjQTNDTixFQTJDc0I7QUFDMUNSLElBQUFBLG1CQUFtQixDQUFDQyxVQUFwQixHQUFpQ1EsQ0FBQyxDQUFDRixpQkFBRCxDQUFsQztBQUNBUCxJQUFBQSxtQkFBbUIsQ0FBQ0ss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IC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBPcGVuQXBpQVBJLCBGb3JtICovXG5cbi8qKlxuICogUGVybWlzc2lvbnNTZWxlY3RvciAtIFVJIGNvbXBvbmVudCBmb3Igc2VsZWN0aW5nIEFQSSBlbmRwb2ludCBwZXJtaXNzaW9uc1xuICpcbiAqIFRoaXMgY29tcG9uZW50IHByb3ZpZGVzIGFuIGludGVyYWN0aXZlIHRhYmxlIGZvciBzZWxlY3RpbmcgcmVhZC93cml0ZSBwZXJtaXNzaW9uc1xuICogZm9yIGVhY2ggUkVTVCBBUEkgZW5kcG9pbnQgd2hlbiBjcmVhdGluZyBvciBlZGl0aW5nIEFQSSBrZXlzLlxuICpcbiAqIEBtb2R1bGUgUGVybWlzc2lvbnNTZWxlY3RvclxuICovXG5jb25zdCBQZXJtaXNzaW9uc1NlbGVjdG9yID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGNvbnRhaW5lciBlbGVtZW50IHdoZXJlIHRoZSBwZXJtaXNzaW9ucyB0YWJsZSB3aWxsIGJlIHJlbmRlcmVkXG4gICAgICogQHR5cGUge2pRdWVyeXxudWxsfVxuICAgICAqL1xuICAgICRjb250YWluZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBdmFpbGFibGUgZW5kcG9pbnRzIGRhdGEgbG9hZGVkIGZyb20gdGhlIEFQSVxuICAgICAqIFN0cnVjdHVyZToge3BhdGg6IHtsYWJlbCwgZGVzY3JpcHRpb24sIGF2YWlsYWJsZV9hY3Rpb25zLCBlbmRwb2ludHN9fVxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgYXZhaWxhYmxlRW5kcG9pbnRzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEFjdGlvbiBkZXNjcmlwdGlvbnMgZm9yIFVJIHRvb2x0aXBzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBhY3Rpb25EZXNjcmlwdGlvbnM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzIGluIHN5bmNocm9uaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHN5bmNJblByb2dyZXNzOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBtYW51YWwgcGVybWlzc2lvbiBjaGFuZ2VzIChzZXQgYnkgcGFyZW50IGNvbXBvbmVudClcbiAgICAgKiBAdHlwZSB7RnVuY3Rpb258bnVsbH1cbiAgICAgKi9cbiAgICBvbk1hbnVhbENoYW5nZUNhbGxiYWNrOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcGVybWlzc2lvbnMgc2VsZWN0b3IgY29tcG9uZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVyU2VsZWN0b3IgLSBDU1Mgc2VsZWN0b3IgZm9yIHRoZSBjb250YWluZXIgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uTWFudWFsQ2hhbmdlIC0gQ2FsbGJhY2sgd2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgcGVybWlzc2lvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogUGVybWlzc2lvbnNTZWxlY3Rvci5pbml0aWFsaXplKCcjcGVybWlzc2lvbnMtY29udGFpbmVyJywgKCkgPT4ge1xuICAgICAqICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKGNvbnRhaW5lclNlbGVjdG9yLCBvbk1hbnVhbENoYW5nZSkge1xuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIgPSAkKGNvbnRhaW5lclNlbGVjdG9yKTtcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5vbk1hbnVhbENoYW5nZUNhbGxiYWNrID0gb25NYW51YWxDaGFuZ2UgfHwgbnVsbDtcblxuICAgICAgICBpZiAoUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUGVybWlzc2lvbnNTZWxlY3RvcjogQ29udGFpbmVyIG5vdCBmb3VuZDonLCBjb250YWluZXJTZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmh0bWwoXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+J1xuICAgICAgICApO1xuXG4gICAgICAgIC8vIExvYWQgZW5kcG9pbnRzIHRocm91Z2ggT3BlbkFwaUFQSVxuICAgICAgICBPcGVuQXBpQVBJLkdldFNpbXBsaWZpZWRQZXJtaXNzaW9ucyhcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNTdWNjZXNzLFxuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5jYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc0ZhaWx1cmVcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VjY2VzcyBjYWxsYmFjayBmb3IgbG9hZGluZyBzaW1wbGlmaWVkIHBlcm1pc3Npb25zXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3BvbnNlLnJlc3VsdCAtIFN1Y2Nlc3MgZmxhZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZS5kYXRhIC0gUmVzcG9uc2UgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZS5kYXRhLnJlc291cmNlcyAtIEF2YWlsYWJsZSByZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UuZGF0YS5hY3Rpb25fZGVzY3JpcHRpb25zIC0gQWN0aW9uIGRlc2NyaXB0aW9uc1xuICAgICAqL1xuICAgIGNiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuYXZhaWxhYmxlRW5kcG9pbnRzID0gcmVzcG9uc2UuZGF0YS5yZXNvdXJjZXMgfHwge307XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmFjdGlvbkRlc2NyaXB0aW9ucyA9IHJlc3BvbnNlLmRhdGEuYWN0aW9uX2Rlc2NyaXB0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IucmVuZGVyVUkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNGYWlsdXJlKHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGYWlsdXJlIGNhbGxiYWNrIGZvciBsb2FkaW5nIHNpbXBsaWZpZWQgcGVybWlzc2lvbnNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNGYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzIHx8IGdsb2JhbFRyYW5zbGF0ZS5ha19FcnJvckxvYWRpbmdFbmRwb2ludHM7XG4gICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1lc3NhZ2UpO1xuXG4gICAgICAgIC8vIFNob3cgZXJyb3Igc3RhdGVcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmh0bWwoXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIG1lc3NhZ2VcIj4nICtcbiAgICAgICAgICAgICcgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4nICtcbiAgICAgICAgICAgICcgICcgKyBlcnJvck1lc3NhZ2UgK1xuICAgICAgICAgICAgJzwvZGl2PidcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBwZXJtaXNzaW9ucyBzZWxlY3Rpb24gVUkgYXMgYSB0YWJsZVxuICAgICAqIENyZWF0ZXMgYSB0YWJsZSBvZiBlbmRwb2ludHMgd2l0aCBkcm9wZG93biBzZWxlY3RvcnMgZm9yIHBlcm1pc3Npb25zXG4gICAgICovXG4gICAgcmVuZGVyVUkoKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhQZXJtaXNzaW9uc1NlbGVjdG9yLmF2YWlsYWJsZUVuZHBvaW50cykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuaHRtbChcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPicgK1xuICAgICAgICAgICAgICAgICcgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT4nICtcbiAgICAgICAgICAgICAgICAnICAnICsgZ2xvYmFsVHJhbnNsYXRlLmFrX05vRW5kcG9pbnRzQXZhaWxhYmxlICtcbiAgICAgICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBodG1sID0gYFxuICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgY2VsbGVkIHN0cmlwZWQgdGFibGVcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5ha19QZXJtaXNzaW9uVGFibGVIZWFkZXJOYW1lfTwvdGg+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGg+JHtnbG9iYWxUcmFuc2xhdGUuYWtfUGVybWlzc2lvblRhYmxlSGVhZGVyVVJJfTwvdGg+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiIHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25UYWJsZUhlYWRlckFjY2Vzc308L3RoPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICBgO1xuXG4gICAgICAgICQuZWFjaChQZXJtaXNzaW9uc1NlbGVjdG9yLmF2YWlsYWJsZUVuZHBvaW50cywgZnVuY3Rpb24ocGF0aCwgaW5mbykge1xuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VJZCA9IFBlcm1pc3Npb25zU2VsZWN0b3Iuc2FuaXRpemVQYXRoRm9ySWQocGF0aCk7XG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IGluZm8ubGFiZWwgfHwgcGF0aDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gaW5mby5kZXNjcmlwdGlvbiB8fCAnJztcblxuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPHRyIGRhdGEtcGF0aD1cIiR7cGF0aH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtsYWJlbH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2Rlc2NyaXB0aW9uID8gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPjxzbWFsbD4ke2Rlc2NyaXB0aW9ufTwvc21hbGw+PC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxjb2RlPiR7cGF0aH08L2NvZGU+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBzZWxlY3Rpb24gZHJvcGRvd25cIiBpZD1cInBlcm1pc3Npb24tZHJvcGRvd24tJHtyZXNvdXJjZUlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInBlcm1pc3Npb25bJHtwYXRofV1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtnbG9iYWxUcmFuc2xhdGUuYWtfU2VsZWN0UGVybWlzc2lvbn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYmFuIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19Ob0FjY2Vzc31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cInJlYWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXllIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ha19QZXJtaXNzaW9uUmVhZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIndyaXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25Xcml0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIGA7XG5cbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmh0bWwoaHRtbCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSBkcm9wZG93bnNcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyLmZpbmQoJy51aS5kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBQZXJtaXNzaW9uc1NlbGVjdG9yLm9uUGVybWlzc2lvbkNoYW5nZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBlcm1pc3Npb24gZHJvcGRvd24gY2hhbmdlIGV2ZW50XG4gICAgICogTm90aWZpZXMgcGFyZW50IGNvbXBvbmVudCBhYm91dCBtYW51YWwgY2hhbmdlc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgcGVybWlzc2lvbiB2YWx1ZSAocmVhZC93cml0ZS9lbXB0eSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFNlbGVjdGVkIG9wdGlvbiB0ZXh0XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjaG9pY2UgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBzZWxlY3RlZCBpdGVtXG4gICAgICovXG4gICAgb25QZXJtaXNzaW9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgIC8vIFByZXZlbnQgdHJpZ2dlcmluZyBjYWxsYmFjayBkdXJpbmcgcHJvZ3JhbW1hdGljIHN5bmNcbiAgICAgICAgaWYgKFBlcm1pc3Npb25zU2VsZWN0b3Iuc3luY0luUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGlmeSBwYXJlbnQgY29tcG9uZW50IGFib3V0IG1hbnVhbCBjaGFuZ2VcbiAgICAgICAgaWYgKFBlcm1pc3Npb25zU2VsZWN0b3Iub25NYW51YWxDaGFuZ2VDYWxsYmFjaykge1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5vbk1hbnVhbENoYW5nZUNhbGxiYWNrKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGFsbCBwZXJtaXNzaW9ucyB0byBhIHNwZWNpZmljIHZhbHVlIChmb3IgZnVsbF9wZXJtaXNzaW9ucyB0b2dnbGUpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGVybWlzc2lvbiAtIFBlcm1pc3Npb24gdmFsdWUgdG8gc2V0ICgncmVhZCcsICd3cml0ZScsIG9yICcnKVxuICAgICAqL1xuICAgIHNldEFsbFBlcm1pc3Npb25zKHBlcm1pc3Npb24pIHtcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zeW5jSW5Qcm9ncmVzcyA9IHRydWU7XG5cbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyXG4gICAgICAgICAgICAuZmluZCgnLnVpLmRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgcGVybWlzc2lvbik7XG5cbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zeW5jSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYW5pdGl6ZSBwYXRoIHN0cmluZyB0byBjcmVhdGUgdmFsaWQgSFRNTCBpZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBBUEkgcGF0aFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gU2FuaXRpemVkIGlkIHN0cmluZ1xuICAgICAqL1xuICAgIHNhbml0aXplUGF0aEZvcklkKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvW15hLXpBLVowLTldL2csICctJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzZWxlY3RlZCBwZXJtaXNzaW9ucyBmcm9tIHRoZSBVSVxuICAgICAqIFJldHVybnMgb25seSBub24tZW1wdHkgcGVybWlzc2lvbnMgKHdoZXJlIHVzZXIgc2VsZWN0ZWQgcmVhZCBvciB3cml0ZSlcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gT2JqZWN0IHdpdGggcGF0aCBhcyBrZXkgYW5kIHBlcm1pc3Npb24gYXMgdmFsdWVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFJldHVybnM6IHtcIi9hcGkvdjMvZXh0ZW5zaW9uc1wiOiBcIndyaXRlXCIsIFwiL2FwaS92My9jZHJcIjogXCJyZWFkXCJ9XG4gICAgICogY29uc3QgcGVybWlzc2lvbnMgPSBQZXJtaXNzaW9uc1NlbGVjdG9yLmdldFNlbGVjdGVkUGVybWlzc2lvbnMoKTtcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25zKCkge1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lclxuICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWVePVwicGVybWlzc2lvbltcIl0nKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcGF0aCBmcm9tIG5hbWU6IHBlcm1pc3Npb25bL2FwaS92My9leHRlbnNpb25zXSAtPiAvYXBpL3YzL2V4dGVuc2lvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IG5hbWUubWF0Y2goL3Blcm1pc3Npb25cXFsoLio/KVxcXS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gbWF0Y2hbMV07XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBpbmNsdWRlIG5vbi1lbXB0eSBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgIT09ICcnICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcm1pc3Npb25zW3BhdGhdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcGVybWlzc2lvbnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBwZXJtaXNzaW9ucyBpbiB0aGUgVUkgKHVzZWQgd2hlbiBsb2FkaW5nIGV4aXN0aW5nIEFQSSBrZXkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGVybWlzc2lvbnMgLSBPYmplY3Qgd2l0aCBwYXRoIGFzIGtleSBhbmQgcGVybWlzc2lvbiBhcyB2YWx1ZVxuICAgICAqIEBleGFtcGxlXG4gICAgICogUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRQZXJtaXNzaW9ucyh7XG4gICAgICogICBcIi9hcGkvdjMvZXh0ZW5zaW9uc1wiOiBcIndyaXRlXCIsXG4gICAgICogICBcIi9hcGkvdjMvY2RyXCI6IFwicmVhZFwiXG4gICAgICogfSk7XG4gICAgICovXG4gICAgc2V0UGVybWlzc2lvbnMocGVybWlzc2lvbnMpIHtcbiAgICAgICAgaWYgKCFwZXJtaXNzaW9ucyB8fCB0eXBlb2YgcGVybWlzc2lvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnN5bmNJblByb2dyZXNzID0gdHJ1ZTtcblxuICAgICAgICAkLmVhY2gocGVybWlzc2lvbnMsIGZ1bmN0aW9uKHBhdGgsIGFjdGlvbikge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyXG4gICAgICAgICAgICAgICAgLmZpbmQoYGlucHV0W25hbWU9XCJwZXJtaXNzaW9uWyR7cGF0aH1dXCJdYCk7XG5cbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICRpbnB1dC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGFjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc3luY0luUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIHNlbGVjdGVkIHBlcm1pc3Npb25zIChzZXQgYWxsIHRvIG5vQWNjZXNzKVxuICAgICAqL1xuICAgIGNsZWFyUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0QWxsUGVybWlzc2lvbnMoJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjb21wb25lbnQgaXMgaW5pdGlhbGl6ZWQgYW5kIHJlYWR5XG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1JlYWR5KCkge1xuICAgICAgICByZXR1cm4gUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICBPYmplY3Qua2V5cyhQZXJtaXNzaW9uc1NlbGVjdG9yLmF2YWlsYWJsZUVuZHBvaW50cykubGVuZ3RoID4gMDtcbiAgICB9XG59O1xuIl19