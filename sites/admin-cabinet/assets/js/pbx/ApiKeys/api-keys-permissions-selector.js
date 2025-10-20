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

/* global $, globalTranslate, UserMessage, OpenApiAPI */

/**
 * PermissionsSelector - UI component for selecting API endpoint permissions
 *
 * This component provides an interactive UI for selecting read/write permissions
 * for each REST API endpoint when creating or editing API keys.
 *
 * @module PermissionsSelector
 */
var PermissionsSelector = {
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
  initialize: function initialize(containerSelector) {
    PermissionsSelector.$container = $(containerSelector);

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
   * Render the permissions selection UI
   * Creates a list of endpoints with dropdown selectors for permissions
   */
  renderUI: function renderUI() {
    if (Object.keys(PermissionsSelector.availableEndpoints).length === 0) {
      PermissionsSelector.$container.html('<div class="ui info message">' + '  <i class="info circle icon"></i>' + '  ' + globalTranslate.ak_NoEndpointsAvailable + '</div>');
      return;
    }

    var html = '<div class="ui middle aligned divided list">';
    $.each(PermissionsSelector.availableEndpoints, function (path, info) {
      var resourceId = PermissionsSelector.sanitizePathForId(path);
      html += "\n                <div class=\"item\" data-path=\"".concat(path, "\">\n                    <div class=\"right floated content\">\n                        <div class=\"ui compact selection dropdown\" id=\"permission-dropdown-").concat(resourceId, "\">\n                            <input type=\"hidden\"\n                                   name=\"permission[").concat(path, "]\"\n                                   value=\"\">\n                            <i class=\"dropdown icon\"></i>\n                            <div class=\"default text\">").concat(globalTranslate.ak_SelectPermission, "</div>\n                            <div class=\"menu\">\n                                <div class=\"item\" data-value=\"\">\n                                    <i class=\"ban icon\"></i>\n                                    ").concat(globalTranslate.ak_NoAccess, "\n                                </div>\n                                <div class=\"item\" data-value=\"read\">\n                                    <i class=\"eye icon\"></i>\n                                    ").concat(globalTranslate.ak_PermissionRead, "\n                                </div>\n                                <div class=\"item\" data-value=\"write\">\n                                    <i class=\"edit icon\"></i>\n                                    ").concat(globalTranslate.ak_PermissionWrite, "\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                    <div class=\"content\">\n                        <div class=\"header\">").concat(info.label || path, "</div>\n                        <div class=\"description\">\n                            <small class=\"ui grey text\">").concat(path, "</small>\n                        </div>\n                    </div>\n                </div>\n            ");
    });
    html += '</div>';
    PermissionsSelector.$container.html(html); // Initialize Fomantic UI dropdowns

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
  onPermissionChange: function onPermissionChange(value, text, $choice) {// Can be used for validation or real-time feedback
    // Currently just allows the change
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

    $.each(permissions, function (path, action) {
      var $input = PermissionsSelector.$container.find("input[name=\"permission[".concat(path, "]\"]"));

      if ($input.length > 0) {
        var $dropdown = $input.closest('.ui.dropdown');
        $dropdown.dropdown('set selected', action);
      }
    });
  },

  /**
   * Clear all selected permissions
   */
  clearPermissions: function clearPermissions() {
    PermissionsSelector.$container.find('.ui.dropdown').dropdown('clear');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLXBlcm1pc3Npb25zLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlBlcm1pc3Npb25zU2VsZWN0b3IiLCIkY29udGFpbmVyIiwiYXZhaWxhYmxlRW5kcG9pbnRzIiwiYWN0aW9uRGVzY3JpcHRpb25zIiwiaW5pdGlhbGl6ZSIsImNvbnRhaW5lclNlbGVjdG9yIiwiJCIsImxlbmd0aCIsImNvbnNvbGUiLCJlcnJvciIsImh0bWwiLCJPcGVuQXBpQVBJIiwiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zIiwiY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNTdWNjZXNzIiwiY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNGYWlsdXJlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwicmVzb3VyY2VzIiwiYWN0aW9uX2Rlc2NyaXB0aW9ucyIsInJlbmRlclVJIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19FcnJvckxvYWRpbmdFbmRwb2ludHMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIk9iamVjdCIsImtleXMiLCJha19Ob0VuZHBvaW50c0F2YWlsYWJsZSIsImVhY2giLCJwYXRoIiwiaW5mbyIsInJlc291cmNlSWQiLCJzYW5pdGl6ZVBhdGhGb3JJZCIsImFrX1NlbGVjdFBlcm1pc3Npb24iLCJha19Ob0FjY2VzcyIsImFrX1Blcm1pc3Npb25SZWFkIiwiYWtfUGVybWlzc2lvbldyaXRlIiwibGFiZWwiLCJmaW5kIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsIm9uUGVybWlzc2lvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJyZXBsYWNlIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsInBlcm1pc3Npb25zIiwiJGlucHV0IiwibmFtZSIsImF0dHIiLCJ2YWwiLCJtYXRjaCIsInVuZGVmaW5lZCIsInNldFBlcm1pc3Npb25zIiwiYWN0aW9u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RUFBb0IsVUFBU2xCLElBQVQsRUFBZTBCLE1BQWYsRUFBdUI7QUFDdkMsVUFBTVAsTUFBTSxHQUFHbEQsbUJBQW1CLENBQUNDLFVBQXBCLENBQ1Z1QyxJQURVLG1DQUNxQlQsSUFEckIsVUFBZjs7QUFHQSxVQUFJbUIsTUFBTSxDQUFDM0MsTUFBUCxHQUFnQixDQUFwQixFQUF1QjtBQUNuQixZQUFNbUQsU0FBUyxHQUFHUixNQUFNLENBQUNTLE9BQVAsQ0FBZSxjQUFmLENBQWxCO0FBQ0FELFFBQUFBLFNBQVMsQ0FBQ2pCLFFBQVYsQ0FBbUIsY0FBbkIsRUFBbUNnQixNQUFuQztBQUNIO0FBQ0osS0FSRDtBQVNILEdBdE91Qjs7QUF3T3hCO0FBQ0o7QUFDQTtBQUNJRyxFQUFBQSxnQkEzT3dCLDhCQTJPTDtBQUNmNUQsSUFBQUEsbUJBQW1CLENBQUNDLFVBQXBCLENBQ0t1QyxJQURMLENBQ1UsY0FEVixFQUVLQyxRQUZMLENBRWMsT0FGZDtBQUdILEdBL091Qjs7QUFpUHhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW9CLEVBQUFBLE9BdFB3QixxQkFzUGQ7QUFDTixXQUFPN0QsbUJBQW1CLENBQUNDLFVBQXBCLEtBQW1DLElBQW5DLElBQ0EwQixNQUFNLENBQUNDLElBQVAsQ0FBWTVCLG1CQUFtQixDQUFDRSxrQkFBaEMsRUFBb0RLLE1BQXBELEdBQTZELENBRHBFO0FBRUg7QUF6UHVCLENBQTVCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIE9wZW5BcGlBUEkgKi9cblxuLyoqXG4gKiBQZXJtaXNzaW9uc1NlbGVjdG9yIC0gVUkgY29tcG9uZW50IGZvciBzZWxlY3RpbmcgQVBJIGVuZHBvaW50IHBlcm1pc3Npb25zXG4gKlxuICogVGhpcyBjb21wb25lbnQgcHJvdmlkZXMgYW4gaW50ZXJhY3RpdmUgVUkgZm9yIHNlbGVjdGluZyByZWFkL3dyaXRlIHBlcm1pc3Npb25zXG4gKiBmb3IgZWFjaCBSRVNUIEFQSSBlbmRwb2ludCB3aGVuIGNyZWF0aW5nIG9yIGVkaXRpbmcgQVBJIGtleXMuXG4gKlxuICogQG1vZHVsZSBQZXJtaXNzaW9uc1NlbGVjdG9yXG4gKi9cbmNvbnN0IFBlcm1pc3Npb25zU2VsZWN0b3IgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgY29udGFpbmVyIGVsZW1lbnQgd2hlcmUgdGhlIHBlcm1pc3Npb25zIFVJIHdpbGwgYmUgcmVuZGVyZWRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fG51bGx9XG4gICAgICovXG4gICAgJGNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEF2YWlsYWJsZSBlbmRwb2ludHMgZGF0YSBsb2FkZWQgZnJvbSB0aGUgQVBJXG4gICAgICogU3RydWN0dXJlOiB7cGF0aDoge2xhYmVsLCBkZXNjcmlwdGlvbiwgYXZhaWxhYmxlX2FjdGlvbnMsIGVuZHBvaW50c319XG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBhdmFpbGFibGVFbmRwb2ludHM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQWN0aW9uIGRlc2NyaXB0aW9ucyBmb3IgVUkgdG9vbHRpcHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGFjdGlvbkRlc2NyaXB0aW9uczoge30sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwZXJtaXNzaW9ucyBzZWxlY3RvciBjb21wb25lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250YWluZXJTZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGhlIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRpYWxpemUoJyNwZXJtaXNzaW9ucy1jb250YWluZXInKTtcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKGNvbnRhaW5lclNlbGVjdG9yKSB7XG4gICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lciA9ICQoY29udGFpbmVyU2VsZWN0b3IpO1xuXG4gICAgICAgIGlmIChQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQZXJtaXNzaW9uc1NlbGVjdG9yOiBDb250YWluZXIgbm90IGZvdW5kOicsIGNvbnRhaW5lclNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuaHRtbChcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGNlbnRlcmVkIGlubGluZSBsb2FkZXJcIj48L2Rpdj4nXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTG9hZCBlbmRwb2ludHMgdGhyb3VnaCBPcGVuQXBpQVBJXG4gICAgICAgIE9wZW5BcGlBUEkuR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zKFxuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5jYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc1N1Y2Nlc3MsXG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmNiR2V0U2ltcGxpZmllZFBlcm1pc3Npb25zRmFpbHVyZVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWNjZXNzIGNhbGxiYWNrIGZvciBsb2FkaW5nIHNpbXBsaWZpZWQgcGVybWlzc2lvbnNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzcG9uc2UucmVzdWx0IC0gU3VjY2VzcyBmbGFnXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlLmRhdGEgLSBSZXNwb25zZSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlLmRhdGEucmVzb3VyY2VzIC0gQXZhaWxhYmxlIHJlc291cmNlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZS5kYXRhLmFjdGlvbl9kZXNjcmlwdGlvbnMgLSBBY3Rpb24gZGVzY3JpcHRpb25zXG4gICAgICovXG4gICAgY2JHZXRTaW1wbGlmaWVkUGVybWlzc2lvbnNTdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5hdmFpbGFibGVFbmRwb2ludHMgPSByZXNwb25zZS5kYXRhLnJlc291cmNlcyB8fCB7fTtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuYWN0aW9uRGVzY3JpcHRpb25zID0gcmVzcG9uc2UuZGF0YS5hY3Rpb25fZGVzY3JpcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5yZW5kZXJVSSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5jYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc0ZhaWx1cmUocmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZhaWx1cmUgY2FsbGJhY2sgZm9yIGxvYWRpbmcgc2ltcGxpZmllZCBwZXJtaXNzaW9uc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBjYkdldFNpbXBsaWZpZWRQZXJtaXNzaW9uc0ZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmFrX0Vycm9yTG9hZGluZ0VuZHBvaW50cztcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSk7XG5cbiAgICAgICAgLy8gU2hvdyBlcnJvciBzdGF0ZVxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuaHRtbChcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgbWVzc2FnZVwiPicgK1xuICAgICAgICAgICAgJyAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPicgK1xuICAgICAgICAgICAgJyAgJyArIGVycm9yTWVzc2FnZSArXG4gICAgICAgICAgICAnPC9kaXY+J1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIHBlcm1pc3Npb25zIHNlbGVjdGlvbiBVSVxuICAgICAqIENyZWF0ZXMgYSBsaXN0IG9mIGVuZHBvaW50cyB3aXRoIGRyb3Bkb3duIHNlbGVjdG9ycyBmb3IgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICByZW5kZXJVSSgpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKFBlcm1pc3Npb25zU2VsZWN0b3IuYXZhaWxhYmxlRW5kcG9pbnRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lci5odG1sKFxuICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JyArXG4gICAgICAgICAgICAgICAgJyAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICcgICcgKyBnbG9iYWxUcmFuc2xhdGUuYWtfTm9FbmRwb2ludHNBdmFpbGFibGUgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIG1pZGRsZSBhbGlnbmVkIGRpdmlkZWQgbGlzdFwiPic7XG5cbiAgICAgICAgJC5lYWNoKFBlcm1pc3Npb25zU2VsZWN0b3IuYXZhaWxhYmxlRW5kcG9pbnRzLCBmdW5jdGlvbihwYXRoLCBpbmZvKSB7XG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUlkID0gUGVybWlzc2lvbnNTZWxlY3Rvci5zYW5pdGl6ZVBhdGhGb3JJZChwYXRoKTtcblxuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXBhdGg9XCIke3BhdGh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodCBmbG9hdGVkIGNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IHNlbGVjdGlvbiBkcm9wZG93blwiIGlkPVwicGVybWlzc2lvbi1kcm9wZG93bi0ke3Jlc291cmNlSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvblske3BhdGh9XVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3RQZXJtaXNzaW9ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJiYW4gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX05vQWNjZXNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwicmVhZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmFrX1Blcm1pc3Npb25SZWFkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwid3JpdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuYWtfUGVybWlzc2lvbldyaXRlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2luZm8ubGFiZWwgfHwgcGF0aH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzbWFsbCBjbGFzcz1cInVpIGdyZXkgdGV4dFwiPiR7cGF0aH08L3NtYWxsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcblxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuaHRtbChodG1sKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEZvbWFudGljIFVJIGRyb3Bkb3duc1xuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXIuZmluZCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IFBlcm1pc3Npb25zU2VsZWN0b3Iub25QZXJtaXNzaW9uQ2hhbmdlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcGVybWlzc2lvbiBkcm9wZG93biBjaGFuZ2UgZXZlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIHBlcm1pc3Npb24gdmFsdWUgKHJlYWQvd3JpdGUvZW1wdHkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBTZWxlY3RlZCBvcHRpb24gdGV4dFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY2hvaWNlIC0galF1ZXJ5IG9iamVjdCBvZiB0aGUgc2VsZWN0ZWQgaXRlbVxuICAgICAqL1xuICAgIG9uUGVybWlzc2lvbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAvLyBDYW4gYmUgdXNlZCBmb3IgdmFsaWRhdGlvbiBvciByZWFsLXRpbWUgZmVlZGJhY2tcbiAgICAgICAgLy8gQ3VycmVudGx5IGp1c3QgYWxsb3dzIHRoZSBjaGFuZ2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgcGF0aCBzdHJpbmcgdG8gY3JlYXRlIHZhbGlkIEhUTUwgaWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gQVBJIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFNhbml0aXplZCBpZCBzdHJpbmdcbiAgICAgKi9cbiAgICBzYW5pdGl6ZVBhdGhGb3JJZChwYXRoKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1teYS16QS1aMC05XS9nLCAnLScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbnMgZnJvbSB0aGUgVUlcbiAgICAgKiBSZXR1cm5zIG9ubHkgbm9uLWVtcHR5IHBlcm1pc3Npb25zICh3aGVyZSB1c2VyIHNlbGVjdGVkIHJlYWQgb3Igd3JpdGUpXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIE9iamVjdCB3aXRoIHBhdGggYXMga2V5IGFuZCBwZXJtaXNzaW9uIGFzIHZhbHVlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBSZXR1cm5zOiB7XCIvYXBpL3YzL2V4dGVuc2lvbnNcIjogXCJ3cml0ZVwiLCBcIi9hcGkvdjMvY2RyXCI6IFwicmVhZFwifVxuICAgICAqIGNvbnN0IHBlcm1pc3Npb25zID0gUGVybWlzc2lvbnNTZWxlY3Rvci5nZXRTZWxlY3RlZFBlcm1pc3Npb25zKCk7XG4gICAgICovXG4gICAgZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7fTtcblxuICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLiRjb250YWluZXJcbiAgICAgICAgICAgIC5maW5kKCdpbnB1dFtuYW1lXj1cInBlcm1pc3Npb25bXCJdJylcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBhdGggZnJvbSBuYW1lOiBwZXJtaXNzaW9uWy9hcGkvdjMvZXh0ZW5zaW9uc10gLT4gL2FwaS92My9leHRlbnNpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBuYW1lLm1hdGNoKC9wZXJtaXNzaW9uXFxbKC4qPylcXF0vKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IG1hdGNoWzFdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgaW5jbHVkZSBub24tZW1wdHkgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9PSAnJyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1twYXRoXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHBlcm1pc3Npb25zO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgcGVybWlzc2lvbnMgaW4gdGhlIFVJICh1c2VkIHdoZW4gbG9hZGluZyBleGlzdGluZyBBUEkga2V5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBlcm1pc3Npb25zIC0gT2JqZWN0IHdpdGggcGF0aCBhcyBrZXkgYW5kIHBlcm1pc3Npb24gYXMgdmFsdWVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0UGVybWlzc2lvbnMoe1xuICAgICAqICAgXCIvYXBpL3YzL2V4dGVuc2lvbnNcIjogXCJ3cml0ZVwiLFxuICAgICAqICAgXCIvYXBpL3YzL2NkclwiOiBcInJlYWRcIlxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHNldFBlcm1pc3Npb25zKHBlcm1pc3Npb25zKSB7XG4gICAgICAgIGlmICghcGVybWlzc2lvbnMgfHwgdHlwZW9mIHBlcm1pc3Npb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5lYWNoKHBlcm1pc3Npb25zLCBmdW5jdGlvbihwYXRoLCBhY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9IFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIC5maW5kKGBpbnB1dFtuYW1lPVwicGVybWlzc2lvblske3BhdGh9XVwiXWApO1xuXG4gICAgICAgICAgICBpZiAoJGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkaW5wdXQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBhY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIHNlbGVjdGVkIHBlcm1pc3Npb25zXG4gICAgICovXG4gICAgY2xlYXJQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci4kY29udGFpbmVyXG4gICAgICAgICAgICAuZmluZCgnLnVpLmRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bignY2xlYXInKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgY29tcG9uZW50IGlzIGluaXRpYWxpemVkIGFuZCByZWFkeVxuICAgICAqXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNSZWFkeSgpIHtcbiAgICAgICAgcmV0dXJuIFBlcm1pc3Npb25zU2VsZWN0b3IuJGNvbnRhaW5lciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoUGVybWlzc2lvbnNTZWxlY3Rvci5hdmFpbGFibGVFbmRwb2ludHMpLmxlbmd0aCA+IDA7XG4gICAgfVxufTtcbiJdfQ==