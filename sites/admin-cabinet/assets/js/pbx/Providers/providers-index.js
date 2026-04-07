"use strict";

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

/* global globalRootUrl, globalTranslate, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage, ProviderStatusMonitor */

/**
 * Object for managing providers table
 *
 * @module providers
 */
var providers = {
  /**
   * DataTable instance from base class
   */
  dataTableInstance: null,

  /**
   * Delete modal form
   */
  $deleteModalForm: $('#delete-modal-form'),

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    // Initialize delete modal
    providers.$deleteModalForm.modal(); // Initialize the providers table with REST API

    this.initializeDataTable();
  },

  /**
   * Initialize DataTable using base class
   */
  initializeDataTable: function initializeDataTable() {
    var _this = this;

    // Create instance of base class with Providers specific configuration
    this.dataTableInstance = new PbxDataTableIndex({
      tableId: 'providers-table',
      apiModule: ProvidersAPI,
      routePrefix: 'providers',
      showSuccessMessages: false,
      actionButtons: ['edit', 'copy', 'delete'],
      // Include copy button for providers
      ajaxData: {
        includeDisabled: 'true' // Always include disabled providers in admin panel

      },
      translations: {
        deleteError: globalTranslate.pr_ImpossibleToDeleteProvider
      },
      onDataLoaded: this.onDataLoaded.bind(this),
      onDrawCallback: this.onDrawCallback.bind(this),
      onAfterDelete: this.onAfterDeleteSuccess.bind(this),
      // Callback after successful deletion
      order: [[0, 'asc']],
      // Default sorting by status (enabled first)
      columns: [{
        // Enable/disable checkbox column
        data: 'disabled',
        orderable: true,
        searchable: false,
        className: 'collapsing',
        render: function render(data, type, row) {
          if (type === 'sort' || type === 'type') {
            // Return 0 for enabled, 1 for disabled for sorting
            return row.disabled ? 1 : 0;
          }

          var checked = !row.disabled ? 'checked' : '';
          return "\n                            <div class=\"ui fitted toggle checkbox\">\n                                <input type=\"checkbox\" ".concat(checked, " />\n                                <label></label>\n                            </div>\n                        ");
        }
      }, {
        // Status column
        data: null,
        orderable: false,
        searchable: false,
        className: 'center aligned collapsing provider-status',
        render: function render() {
          return '<i class="spinner loading icon"></i>';
        }
      }, {
        // Provider name column - display what comes from server
        data: 'represent',
        className: 'collapsing',
        render: function render(data, type, row) {
          if (type === 'display') {
            // Use SecurityUtils.sanitizeForDisplay with less strict mode for provider icons
            var tmpRepresentation = window.SecurityUtils.sanitizeForDisplay(data || '', false); // Limit the displayed length to 80 characters

            var safeRepresentation = tmpRepresentation.length > 80 ? tmpRepresentation.slice(0, 77) + '...' : tmpRepresentation;
            return "<span>".concat(safeRepresentation, "</span><br><span class=\"features failure\"></span>");
          } // For search and other operations, return plain text


          return [data, row.note, row.type].filter(Boolean).join(' ');
        }
      }, {
        // Host column
        data: 'host',
        className: 'hide-on-mobile',
        render: function render(data) {
          var host = window.SecurityUtils.escapeHtml(data || '');
          return "<span>".concat(host, "</span>");
        }
      }, {
        // Username column
        data: 'username',
        className: 'hide-on-mobile',
        render: function render(data) {
          var username = window.SecurityUtils.escapeHtml(data || '');
          return "<span>".concat(username, "</span>");
        }
      }],
      // Custom URL generator for modify/edit actions
      getModifyUrl: function getModifyUrl(recordId) {
        var data = this.dataTable.rows().data().toArray();
        var record = data.find(function (r) {
          return r.id === recordId;
        });

        if (record) {
          var type = record.type.toLowerCase();
          return "".concat(globalRootUrl, "providers/modify").concat(type, "/").concat(recordId);
        }

        return null;
      },
      // Custom delete handler to use correct API based on provider type
      customDeleteHandler: function customDeleteHandler(recordId, callback) {
        var data = this.dataTable.rows().data().toArray();
        var record = data.find(function (r) {
          return r.id === recordId;
        });

        if (record) {
          // Use type-specific API for deletion
          var apiModule = record.type === 'SIP' ? SipProvidersAPI : IaxProvidersAPI;
          apiModule.deleteRecord(recordId, callback);
        } else {
          // Record not found in table data
          callback({
            result: false,
            messages: {
              error: ['Provider not found in table']
            }
          });
        }
      }
    }); // Initialize the base class

    this.dataTableInstance.initialize(); // Initialize provider status monitor if available

    if (typeof ProviderStatusMonitor !== 'undefined') {
      ProviderStatusMonitor.initialize(); // Request initial status after table loads

      setTimeout(function () {
        _this.requestInitialStatus();
      }, 500);
    }
  },

  /**
   * Callback when data is loaded
   * @param {Object} response - The API response
   */
  onDataLoaded: function onDataLoaded(response) {
    // Extract data from response
    var data = response.data || [];
    var hasProviders = data.length > 0;

    if (hasProviders) {
      // Show table and buttons
      $('#providers-table-container').show();
      $('#add-buttons-group').show();
      $('#empty-table-placeholder').hide();
    } else {
      // Show empty placeholder
      $('#providers-table-container').hide();
      $('#add-buttons-group').hide();
      $('#empty-table-placeholder').show();
    }
  },

  /**
   * Callback after table draw is complete
   */
  onDrawCallback: function onDrawCallback() {
    // Move add buttons group to DataTables wrapper (next to search)
    var $addButtonsGroup = $('#add-buttons-group');
    var $wrapper = $('#providers-table_wrapper');
    var $leftColumn = $wrapper.find('.eight.wide.column').first();

    if ($addButtonsGroup.length && $leftColumn.length) {
      $leftColumn.append($addButtonsGroup); // Show buttons only if table has data

      var hasData = $('#providers-table').DataTable().data().any();

      if (hasData) {
        $addButtonsGroup.show();
      }
    } // Add row data attributes for each provider


    $('#providers-table tbody tr').each(function () {
      var data = $('#providers-table').DataTable().row(this).data();

      if (data) {
        $(this).attr('id', data.id);
        $(this).attr('data-value', 'modify' + data.type.toLowerCase());
        $(this).attr('data-links', data.links || 'false');
        $(this).addClass('provider-row'); // Add disability class to specific cells if provider is disabled

        if (data.disabled) {
          // Add disability and disabled classes to data cells (not checkbox and actions)
          $(this).find('td').each(function (index) {
            var $td = $(this);
            var totalColumns = $(this).parent().find('td').length; // Skip first column (checkbox) and last column (actions)

            if (index > 0 && index < totalColumns - 1) {
              $td.addClass('disability disabled');
            }
          });
        }
      }
    }); // Initialize enable/disable checkboxes

    this.initializeCheckboxes(); // Refresh ProviderStatusMonitor cache after DOM changes

    if (typeof ProviderStatusMonitor !== 'undefined' && ProviderStatusMonitor.refreshCache) {
      ProviderStatusMonitor.refreshCache();
    }
  },

  /**
   * Initialize enable/disable checkboxes
   */
  initializeCheckboxes: function initializeCheckboxes() {
    $('.provider-row .checkbox').checkbox({
      onChecked: function onChecked() {
        var _this2 = this;

        var providerId = $(this).closest('tr').attr('id');
        var type = $(this).closest('tr').attr('data-value'); // Build data object - extract actual type from data-value (remove 'modify' prefix)

        var actualType = type.replace(/^modify/i, '').toUpperCase();
        var data = {
          id: providerId,
          type: actualType,
          disabled: false
        }; // Use REST API v3 to update provider status

        ProvidersAPI.updateStatus(providerId, data, function (response) {
          if (response.result) {
            // Remove disability classes from cells
            $("#".concat(providerId, " td")).removeClass('disability disabled');
          } else {
            // Revert checkbox
            $(_this2).checkbox('set unchecked');
            UserMessage.showMultiString(response.messages);
          }
        });
      },
      onUnchecked: function onUnchecked() {
        var _this3 = this;

        var providerId = $(this).closest('tr').attr('id');
        var type = $(this).closest('tr').attr('data-value'); // Build data object - extract actual type from data-value (remove 'modify' prefix)

        var actualType = type.replace(/^modify/i, '').toUpperCase();
        var data = {
          id: providerId,
          type: actualType,
          disabled: true
        }; // Use REST API v3 to update provider status

        ProvidersAPI.updateStatus(providerId, data, function (response) {
          if (response.result) {
            // Add disability and disabled classes to data cells
            $("#".concat(providerId, " td")).each(function (index) {
              var totalColumns = $("#".concat(providerId, " td")).length; // Skip first column (checkbox) and last column (actions)

              if (index > 0 && index < totalColumns - 1) {
                $(this).addClass('disability disabled');
              }
            });
          } else {
            // Revert checkbox
            $(_this3).checkbox('set checked');
            UserMessage.showMultiString(response.messages);
          }
        });
      }
    });
  },

  /**
   * Callback after successful provider deletion
   * Restores provider statuses after table reload
   */
  onAfterDeleteSuccess: function onAfterDeleteSuccess() {
    var _this4 = this;

    // Request fresh provider statuses after deletion
    setTimeout(function () {
      _this4.requestInitialStatus();
    }, 300);
  },

  /**
   * Request initial provider status on page load
   */
  requestInitialStatus: function requestInitialStatus() {
    ProvidersAPI.getStatuses(function (response) {
      // Manually trigger status update
      if (response && response.data && typeof ProviderStatusMonitor !== 'undefined') {
        ProviderStatusMonitor.updateAllProviderStatuses(response.data);
      }
    });
  }
};
/**
 * Initialize providers on document ready
 */

$(document).ready(function () {
  providers.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsImRhdGFUYWJsZUluc3RhbmNlIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiQiLCJpbml0aWFsaXplIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiUGJ4RGF0YVRhYmxlSW5kZXgiLCJ0YWJsZUlkIiwiYXBpTW9kdWxlIiwiUHJvdmlkZXJzQVBJIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwiYWN0aW9uQnV0dG9ucyIsImFqYXhEYXRhIiwiaW5jbHVkZURpc2FibGVkIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9JbXBvc3NpYmxlVG9EZWxldGVQcm92aWRlciIsIm9uRGF0YUxvYWRlZCIsImJpbmQiLCJvbkRyYXdDYWxsYmFjayIsIm9uQWZ0ZXJEZWxldGUiLCJvbkFmdGVyRGVsZXRlU3VjY2VzcyIsIm9yZGVyIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwidHlwZSIsInJvdyIsImRpc2FibGVkIiwiY2hlY2tlZCIsInRtcFJlcHJlc2VudGF0aW9uIiwid2luZG93IiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRm9yRGlzcGxheSIsInNhZmVSZXByZXNlbnRhdGlvbiIsImxlbmd0aCIsInNsaWNlIiwibm90ZSIsImZpbHRlciIsIkJvb2xlYW4iLCJqb2luIiwiaG9zdCIsImVzY2FwZUh0bWwiLCJ1c2VybmFtZSIsImdldE1vZGlmeVVybCIsInJlY29yZElkIiwiZGF0YVRhYmxlIiwicm93cyIsInRvQXJyYXkiLCJyZWNvcmQiLCJmaW5kIiwiciIsImlkIiwidG9Mb3dlckNhc2UiLCJnbG9iYWxSb290VXJsIiwiY3VzdG9tRGVsZXRlSGFuZGxlciIsImNhbGxiYWNrIiwiU2lwUHJvdmlkZXJzQVBJIiwiSWF4UHJvdmlkZXJzQVBJIiwiZGVsZXRlUmVjb3JkIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsIlByb3ZpZGVyU3RhdHVzTW9uaXRvciIsInNldFRpbWVvdXQiLCJyZXF1ZXN0SW5pdGlhbFN0YXR1cyIsInJlc3BvbnNlIiwiaGFzUHJvdmlkZXJzIiwic2hvdyIsImhpZGUiLCIkYWRkQnV0dG9uc0dyb3VwIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwiaGFzRGF0YSIsIkRhdGFUYWJsZSIsImFueSIsImVhY2giLCJhdHRyIiwibGlua3MiLCJhZGRDbGFzcyIsImluZGV4IiwiJHRkIiwidG90YWxDb2x1bW5zIiwicGFyZW50IiwiaW5pdGlhbGl6ZUNoZWNrYm94ZXMiLCJyZWZyZXNoQ2FjaGUiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsInByb3ZpZGVySWQiLCJjbG9zZXN0IiwiYWN0dWFsVHlwZSIsInJlcGxhY2UiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZVN0YXR1cyIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJvblVuY2hlY2tlZCIsImdldFN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2Q7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBSkw7O0FBTWQ7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FUTDs7QUFXZDtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFkYyx3QkFjRDtBQUNUO0FBQ0FKLElBQUFBLFNBQVMs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QixDQUFDLENBQUN5RyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCN0csRUFBQUEsU0FBUyxDQUFDSSxVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFByb3ZpZGVyc0FQSSwgU2lwUHJvdmlkZXJzQVBJLCBJYXhQcm92aWRlcnNBUEksIFNlY3VyaXR5VXRpbHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBQYnhEYXRhVGFibGVJbmRleCwgVXNlck1lc3NhZ2UsIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgcHJvdmlkZXJzIHRhYmxlXG4gKlxuICogQG1vZHVsZSBwcm92aWRlcnNcbiAqL1xuY29uc3QgcHJvdmlkZXJzID0ge1xuICAgIC8qKlxuICAgICAqIERhdGFUYWJsZSBpbnN0YW5jZSBmcm9tIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBkYXRhVGFibGVJbnN0YW5jZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBtb2RhbCBmb3JtXG4gICAgICovXG4gICAgJGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRlbGV0ZSBtb2RhbFxuICAgICAgICBwcm92aWRlcnMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXJzIHRhYmxlIHdpdGggUkVTVCBBUElcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB1c2luZyBiYXNlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlIG9mIGJhc2UgY2xhc3Mgd2l0aCBQcm92aWRlcnMgc3BlY2lmaWMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlID0gbmV3IFBieERhdGFUYWJsZUluZGV4KHtcbiAgICAgICAgICAgIHRhYmxlSWQ6ICdwcm92aWRlcnMtdGFibGUnLFxuICAgICAgICAgICAgYXBpTW9kdWxlOiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICByb3V0ZVByZWZpeDogJ3Byb3ZpZGVycycsXG4gICAgICAgICAgICBzaG93U3VjY2Vzc01lc3NhZ2VzOiBmYWxzZSxcbiAgICAgICAgICAgIGFjdGlvbkJ1dHRvbnM6IFsnZWRpdCcsICdjb3B5JywgJ2RlbGV0ZSddLCAvLyBJbmNsdWRlIGNvcHkgYnV0dG9uIGZvciBwcm92aWRlcnNcbiAgICAgICAgICAgIGFqYXhEYXRhOiB7XG4gICAgICAgICAgICAgICAgaW5jbHVkZURpc2FibGVkOiAndHJ1ZScgIC8vIEFsd2F5cyBpbmNsdWRlIGRpc2FibGVkIHByb3ZpZGVycyBpbiBhZG1pbiBwYW5lbFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uczoge1xuICAgICAgICAgICAgICAgIGRlbGV0ZUVycm9yOiBnbG9iYWxUcmFuc2xhdGUucHJfSW1wb3NzaWJsZVRvRGVsZXRlUHJvdmlkZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkRhdGFMb2FkZWQ6IHRoaXMub25EYXRhTG9hZGVkLmJpbmQodGhpcyksXG4gICAgICAgICAgICBvbkRyYXdDYWxsYmFjazogdGhpcy5vbkRyYXdDYWxsYmFjay5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25BZnRlckRlbGV0ZTogdGhpcy5vbkFmdGVyRGVsZXRlU3VjY2Vzcy5iaW5kKHRoaXMpLCAvLyBDYWxsYmFjayBhZnRlciBzdWNjZXNzZnVsIGRlbGV0aW9uXG4gICAgICAgICAgICBvcmRlcjogW1swLCAnYXNjJ11dLCAvLyBEZWZhdWx0IHNvcnRpbmcgYnkgc3RhdHVzIChlbmFibGVkIGZpcnN0KVxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5hYmxlL2Rpc2FibGUgY2hlY2tib3ggY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdkaXNhYmxlZCcsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXIoZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ3NvcnQnIHx8IHR5cGUgPT09ICd0eXBlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldHVybiAwIGZvciBlbmFibGVkLCAxIGZvciBkaXNhYmxlZCBmb3Igc29ydGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByb3cuZGlzYWJsZWQgPyAxIDogMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhcm93LmRpc2FibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgdG9nZ2xlIGNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiAke2NoZWNrZWR9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGF0dXMgY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjZW50ZXIgYWxpZ25lZCBjb2xsYXBzaW5nIHByb3ZpZGVyLXN0YXR1cycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIG5hbWUgY29sdW1uIC0gZGlzcGxheSB3aGF0IGNvbWVzIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdyZXByZXNlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZWN1cml0eVV0aWxzLnNhbml0aXplRm9yRGlzcGxheSB3aXRoIGxlc3Mgc3RyaWN0IG1vZGUgZm9yIHByb3ZpZGVyIGljb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG1wUmVwcmVzZW50YXRpb24gPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUZvckRpc3BsYXkoZGF0YSB8fCAnJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpbWl0IHRoZSBkaXNwbGF5ZWQgbGVuZ3RoIHRvIDgwIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlUmVwcmVzZW50YXRpb249IHRtcFJlcHJlc2VudGF0aW9uLmxlbmd0aCA+IDgwID8gdG1wUmVwcmVzZW50YXRpb24uc2xpY2UoMCwgNzcpICsgJy4uLicgOiB0bXBSZXByZXNlbnRhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuPiR7c2FmZVJlcHJlc2VudGF0aW9ufTwvc3Bhbj48YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlcyBmYWlsdXJlXCI+PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzZWFyY2ggYW5kIG90aGVyIG9wZXJhdGlvbnMsIHJldHVybiBwbGFpbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2RhdGEsIHJvdy5ub3RlLCByb3cudHlwZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBIb3N0IGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvc3QgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Bhbj4ke2hvc3R9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlcm5hbWUgY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJuYW1lID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4+JHt1c2VybmFtZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAvLyBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAgICAgICAgZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvd3MoKS5kYXRhKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZCA9IGRhdGEuZmluZChyID0+IHIuaWQgPT09IHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSByZWNvcmQudHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5JHt0eXBlfS8ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIEN1c3RvbSBkZWxldGUgaGFuZGxlciB0byB1c2UgY29ycmVjdCBBUEkgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICAgICAgY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhVGFibGUucm93cygpLmRhdGEoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gZGF0YS5maW5kKHIgPT4gci5pZCA9PT0gcmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHR5cGUtc3BlY2lmaWMgQVBJIGZvciBkZWxldGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcGlNb2R1bGUgPSByZWNvcmQudHlwZSA9PT0gJ1NJUCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgICAgICAgICAgICAgIGFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmQgbm90IGZvdW5kIGluIHRhYmxlIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnUHJvdmlkZXIgbm90IGZvdW5kIGluIHRhYmxlJ119XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBiYXNlIGNsYXNzXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBzdGF0dXMgbW9uaXRvciBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1cyBhZnRlciB0YWJsZSBsb2Fkc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgd2hlbiBkYXRhIGlzIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBvbkRhdGFMb2FkZWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwgW107XG4gICAgICAgIGNvbnN0IGhhc1Byb3ZpZGVycyA9IGRhdGEubGVuZ3RoID4gMDtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNQcm92aWRlcnMpIHtcbiAgICAgICAgICAgIC8vIFNob3cgdGFibGUgYW5kIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUtY29udGFpbmVyJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2FkZC1idXR0b25zLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJCgnI3Byb3ZpZGVycy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLWJ1dHRvbnMtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHRhYmxlIGRyYXcgaXMgY29tcGxldGVcbiAgICAgKi9cbiAgICBvbkRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gTW92ZSBhZGQgYnV0dG9ucyBncm91cCB0byBEYXRhVGFibGVzIHdyYXBwZXIgKG5leHQgdG8gc2VhcmNoKVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uc0dyb3VwID0gJCgnI2FkZC1idXR0b25zLWdyb3VwJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJCgnI3Byb3ZpZGVycy10YWJsZV93cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uc0dyb3VwLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uc0dyb3VwKTtcbiAgICAgICAgICAgIC8vIFNob3cgYnV0dG9ucyBvbmx5IGlmIHRhYmxlIGhhcyBkYXRhXG4gICAgICAgICAgICBjb25zdCBoYXNEYXRhID0gJCgnI3Byb3ZpZGVycy10YWJsZScpLkRhdGFUYWJsZSgpLmRhdGEoKS5hbnkoKTtcbiAgICAgICAgICAgIGlmIChoYXNEYXRhKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbnNHcm91cC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByb3cgZGF0YSBhdHRyaWJ1dGVzIGZvciBlYWNoIHByb3ZpZGVyXG4gICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9ICQoJyNwcm92aWRlcnMtdGFibGUnKS5EYXRhVGFibGUoKS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2lkJywgZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJywgJ21vZGlmeScgKyBkYXRhLnR5cGUudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLWxpbmtzJywgZGF0YS5saW5rcyB8fCAnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdwcm92aWRlci1yb3cnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGlzYWJpbGl0eSBjbGFzcyB0byBzcGVjaWZpYyBjZWxscyBpZiBwcm92aWRlciBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkaXNhYmlsaXR5IGFuZCBkaXNhYmxlZCBjbGFzc2VzIHRvIGRhdGEgY2VsbHMgKG5vdCBjaGVja2JveCBhbmQgYWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCd0ZCcpLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICR0ZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvbHVtbnMgPSAkKHRoaXMpLnBhcmVudCgpLmZpbmQoJ3RkJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBmaXJzdCBjb2x1bW4gKGNoZWNrYm94KSBhbmQgbGFzdCBjb2x1bW4gKGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIGluZGV4IDwgdG90YWxDb2x1bW5zIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0ZC5hZGRDbGFzcygnZGlzYWJpbGl0eSBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbmFibGUvZGlzYWJsZSBjaGVja2JveGVzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNoZWNrYm94ZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggUHJvdmlkZXJTdGF0dXNNb25pdG9yIGNhY2hlIGFmdGVyIERPTSBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQcm92aWRlclN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKSB7XG4gICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcucHJvdmlkZXItcm93IC5jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGRhdGEgb2JqZWN0IC0gZXh0cmFjdCBhY3R1YWwgdHlwZSBmcm9tIGRhdGEtdmFsdWUgKHJlbW92ZSAnbW9kaWZ5JyBwcmVmaXgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSB0eXBlLnJlcGxhY2UoL15tb2RpZnkvaSwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFjdHVhbFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB2MyB0byB1cGRhdGUgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIFByb3ZpZGVyc0FQSS51cGRhdGVTdGF0dXMocHJvdmlkZXJJZCwgZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRpc2FiaWxpdHkgY2xhc3NlcyBmcm9tIGNlbGxzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7cHJvdmlkZXJJZH0gdGRgKS5yZW1vdmVDbGFzcygnZGlzYWJpbGl0eSBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZlcnQgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGRhdGEgb2JqZWN0IC0gZXh0cmFjdCBhY3R1YWwgdHlwZSBmcm9tIGRhdGEtdmFsdWUgKHJlbW92ZSAnbW9kaWZ5JyBwcmVmaXgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSB0eXBlLnJlcGxhY2UoL15tb2RpZnkvaSwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFjdHVhbFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFJFU1QgQVBJIHYzIHRvIHVwZGF0ZSBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgUHJvdmlkZXJzQVBJLnVwZGF0ZVN0YXR1cyhwcm92aWRlcklkLCBkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGlzYWJpbGl0eSBhbmQgZGlzYWJsZWQgY2xhc3NlcyB0byBkYXRhIGNlbGxzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7cHJvdmlkZXJJZH0gdGRgKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvdGFsQ29sdW1ucyA9ICQoYCMke3Byb3ZpZGVySWR9IHRkYCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGZpcnN0IGNvbHVtbiAoY2hlY2tib3gpIGFuZCBsYXN0IGNvbHVtbiAoYWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCAmJiBpbmRleCA8IHRvdGFsQ29sdW1ucyAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ2Rpc2FiaWxpdHkgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZlcnQgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgc3VjY2Vzc2Z1bCBwcm92aWRlciBkZWxldGlvblxuICAgICAqIFJlc3RvcmVzIHByb3ZpZGVyIHN0YXR1c2VzIGFmdGVyIHRhYmxlIHJlbG9hZFxuICAgICAqL1xuICAgIG9uQWZ0ZXJEZWxldGVTdWNjZXNzKCkge1xuICAgICAgICAvLyBSZXF1ZXN0IGZyZXNoIHByb3ZpZGVyIHN0YXR1c2VzIGFmdGVyIGRlbGV0aW9uXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbml0aWFsIHByb3ZpZGVyIHN0YXR1cyBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgUHJvdmlkZXJzQVBJLmdldFN0YXR1c2VzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgdHJpZ2dlciBzdGF0dXMgdXBkYXRlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSAmJiB0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFByb3ZpZGVyU3RhdHVzTW9uaXRvci51cGRhdGVBbGxQcm92aWRlclN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgcHJvdmlkZXJzIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBwcm92aWRlcnMuaW5pdGlhbGl6ZSgpO1xufSk7Il19