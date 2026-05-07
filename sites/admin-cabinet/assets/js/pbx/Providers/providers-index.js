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
   * Delete modal form.
   * Resolved in initialize() — must not call $() at module-load time.
   */
  $deleteModalForm: null,

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    providers.$deleteModalForm = $('#delete-modal-form'); // Initialize delete modal

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsImRhdGFUYWJsZUluc3RhbmNlIiwiJGRlbGV0ZU1vZGFsRm9ybSIsImluaXRpYWxpemUiLCIkIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiUGJ4RGF0YVRhYmxlSW5kZXgiLCJ0YWJsZUlkIiwiYXBpTW9kdWxlIiwiUHJvdmlkZXJzQVBJIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwiYWN0aW9uQnV0dG9ucyIsImFqYXhEYXRhIiwiaW5jbHVkZURpc2FibGVkIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9JbXBvc3NpYmxlVG9EZWxldGVQcm92aWRlciIsIm9uRGF0YUxvYWRlZCIsImJpbmQiLCJvbkRyYXdDYWxsYmFjayIsIm9uQWZ0ZXJEZWxldGUiLCJvbkFmdGVyRGVsZXRlU3VjY2VzcyIsIm9yZGVyIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwidHlwZSIsInJvdyIsImRpc2FibGVkIiwiY2hlY2tlZCIsInRtcFJlcHJlc2VudGF0aW9uIiwid2luZG93IiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRm9yRGlzcGxheSIsInNhZmVSZXByZXNlbnRhdGlvbiIsImxlbmd0aCIsInNsaWNlIiwibm90ZSIsImZpbHRlciIsIkJvb2xlYW4iLCJqb2luIiwiaG9zdCIsImVzY2FwZUh0bWwiLCJ1c2VybmFtZSIsImdldE1vZGlmeVVybCIsInJlY29yZElkIiwiZGF0YVRhYmxlIiwicm93cyIsInRvQXJyYXkiLCJyZWNvcmQiLCJmaW5kIiwiciIsImlkIiwidG9Mb3dlckNhc2UiLCJnbG9iYWxSb290VXJsIiwiY3VzdG9tRGVsZXRlSGFuZGxlciIsImNhbGxiYWNrIiwiU2lwUHJvdmlkZXJzQVBJIiwiSWF4UHJvdmlkZXJzQVBJIiwiZGVsZXRlUmVjb3JkIiwicmVzdWx0IiwibWVzc2FnZXMiLCJlcnJvciIsIlByb3ZpZGVyU3RhdHVzTW9uaXRvciIsInNldFRpbWVvdXQiLCJyZXF1ZXN0SW5pdGlhbFN0YXR1cyIsInJlc3BvbnNlIiwiaGFzUHJvdmlkZXJzIiwic2hvdyIsImhpZGUiLCIkYWRkQnV0dG9uc0dyb3VwIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwiaGFzRGF0YSIsIkRhdGFUYWJsZSIsImFueSIsImVhY2giLCJhdHRyIiwibGlua3MiLCJhZGRDbGFzcyIsImluZGV4IiwiJHRkIiwidG90YWxDb2x1bW5zIiwicGFyZW50IiwiaW5pdGlhbGl6ZUNoZWNrYm94ZXMiLCJyZWZyZXNoQ2FjaGUiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsInByb3ZpZGVySWQiLCJjbG9zZXN0IiwiYWN0dWFsVHlwZSIsInJlcGxhY2UiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZVN0YXR1cyIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJvblVuY2hlY2tlZCIsImdldFN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsU0FBUyxHQUFHO0FBQ2Q7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBSkw7O0FBTWQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsSUFWSjs7QUFZZDtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFmYyx3QkFlRDtBQUNUSCxJQUFBQSxTQUFTLENBQUNFLGdCQUFWLEdBQTZC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Q0g7QUFDSixLQUxEO0FBTUg7QUF6VGEsQ0FBbEI7QUE0VEE7QUFDQTtBQUNBOztBQUNBdkIsQ0FBQyxDQUFDd0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdHLEVBQUFBLFNBQVMsQ0FBQ0csVUFBVjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJLCBTZWN1cml0eVV0aWxzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgUGJ4RGF0YVRhYmxlSW5kZXgsIFVzZXJNZXNzYWdlLCBQcm92aWRlclN0YXR1c01vbml0b3IgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIHByb3ZpZGVycyB0YWJsZVxuICpcbiAqIEBtb2R1bGUgcHJvdmlkZXJzXG4gKi9cbmNvbnN0IHByb3ZpZGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBEYXRhVGFibGUgaW5zdGFuY2UgZnJvbSBiYXNlIGNsYXNzXG4gICAgICovXG4gICAgZGF0YVRhYmxlSW5zdGFuY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgbW9kYWwgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICovXG4gICAgJGRlbGV0ZU1vZGFsRm9ybTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtID0gJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWxldGUgbW9kYWxcbiAgICAgICAgcHJvdmlkZXJzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHByb3ZpZGVycyB0YWJsZSB3aXRoIFJFU1QgQVBJXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgdXNpbmcgYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZSBvZiBiYXNlIGNsYXNzIHdpdGggUHJvdmlkZXJzIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5kYXRhVGFibGVJbnN0YW5jZSA9IG5ldyBQYnhEYXRhVGFibGVJbmRleCh7XG4gICAgICAgICAgICB0YWJsZUlkOiAncHJvdmlkZXJzLXRhYmxlJyxcbiAgICAgICAgICAgIGFwaU1vZHVsZTogUHJvdmlkZXJzQVBJLFxuICAgICAgICAgICAgcm91dGVQcmVmaXg6ICdwcm92aWRlcnMnLFxuICAgICAgICAgICAgc2hvd1N1Y2Nlc3NNZXNzYWdlczogZmFsc2UsXG4gICAgICAgICAgICBhY3Rpb25CdXR0b25zOiBbJ2VkaXQnLCAnY29weScsICdkZWxldGUnXSwgLy8gSW5jbHVkZSBjb3B5IGJ1dHRvbiBmb3IgcHJvdmlkZXJzXG4gICAgICAgICAgICBhamF4RGF0YToge1xuICAgICAgICAgICAgICAgIGluY2x1ZGVEaXNhYmxlZDogJ3RydWUnICAvLyBBbHdheXMgaW5jbHVkZSBkaXNhYmxlZCBwcm92aWRlcnMgaW4gYWRtaW4gcGFuZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBkZWxldGVFcnJvcjogZ2xvYmFsVHJhbnNsYXRlLnByX0ltcG9zc2libGVUb0RlbGV0ZVByb3ZpZGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EYXRhTG9hZGVkOiB0aGlzLm9uRGF0YUxvYWRlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25EcmF3Q2FsbGJhY2s6IHRoaXMub25EcmF3Q2FsbGJhY2suYmluZCh0aGlzKSxcbiAgICAgICAgICAgIG9uQWZ0ZXJEZWxldGU6IHRoaXMub25BZnRlckRlbGV0ZVN1Y2Nlc3MuYmluZCh0aGlzKSwgLy8gQ2FsbGJhY2sgYWZ0ZXIgc3VjY2Vzc2Z1bCBkZWxldGlvblxuICAgICAgICAgICAgb3JkZXI6IFtbMCwgJ2FzYyddXSwgLy8gRGVmYXVsdCBzb3J0aW5nIGJ5IHN0YXR1cyAoZW5hYmxlZCBmaXJzdClcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuYWJsZS9kaXNhYmxlIGNoZWNrYm94IGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnZGlzYWJsZWQnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdzb3J0JyB8fCB0eXBlID09PSAndHlwZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm4gMCBmb3IgZW5hYmxlZCwgMSBmb3IgZGlzYWJsZWQgZm9yIHNvcnRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcm93LmRpc2FibGVkID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGVja2VkID0gIXJvdy5kaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtjaGVja2VkfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RhdHVzIGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY2VudGVyIGFsaWduZWQgY29sbGFwc2luZyBwcm92aWRlci1zdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXIoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBuYW1lIGNvbHVtbiAtIGRpc3BsYXkgd2hhdCBjb21lcyBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAncmVwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUZvckRpc3BsYXkgd2l0aCBsZXNzIHN0cmljdCBtb2RlIGZvciBwcm92aWRlciBpY29uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRtcFJlcHJlc2VudGF0aW9uID0gd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVGb3JEaXNwbGF5KGRhdGEgfHwgJycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMaW1pdCB0aGUgZGlzcGxheWVkIGxlbmd0aCB0byA4MCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVJlcHJlc2VudGF0aW9uPSB0bXBSZXByZXNlbnRhdGlvbi5sZW5ndGggPiA4MCA/IHRtcFJlcHJlc2VudGF0aW9uLnNsaWNlKDAsIDc3KSArICcuLi4nIDogdG1wUmVwcmVzZW50YXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Bhbj4ke3NhZmVSZXByZXNlbnRhdGlvbn08L3NwYW4+PGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXMgZmFpbHVyZVwiPjwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtkYXRhLCByb3cubm90ZSwgcm93LnR5cGVdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSG9zdCBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2hvc3QnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdoaWRlLW9uLW1vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBob3N0ID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4+JHtob3N0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZXJuYW1lIGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdoaWRlLW9uLW1vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1c2VybmFtZSA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuPiR7dXNlcm5hbWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgLy8gQ3VzdG9tIFVSTCBnZW5lcmF0b3IgZm9yIG1vZGlmeS9lZGl0IGFjdGlvbnNcbiAgICAgICAgICAgIGdldE1vZGlmeVVybChyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3dzKCkuZGF0YSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmQgPSBkYXRhLmZpbmQociA9PiByLmlkID09PSByZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gcmVjb3JkLnR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeSR7dHlwZX0vJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBDdXN0b20gZGVsZXRlIGhhbmRsZXIgdG8gdXNlIGNvcnJlY3QgQVBJIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgICAgIGN1c3RvbURlbGV0ZUhhbmRsZXIocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvd3MoKS5kYXRhKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZCA9IGRhdGEuZmluZChyID0+IHIuaWQgPT09IHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSB0eXBlLXNwZWNpZmljIEFQSSBmb3IgZGVsZXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXBpTW9kdWxlID0gcmVjb3JkLnR5cGUgPT09ICdTSVAnID8gU2lwUHJvdmlkZXJzQVBJIDogSWF4UHJvdmlkZXJzQVBJO1xuICAgICAgICAgICAgICAgICAgICBhcGlNb2R1bGUuZGVsZXRlUmVjb3JkKHJlY29yZElkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjb3JkIG5vdCBmb3VuZCBpbiB0YWJsZSBkYXRhXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ1Byb3ZpZGVyIG5vdCBmb3VuZCBpbiB0YWJsZSddfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYmFzZSBjbGFzc1xuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgc3RhdHVzIG1vbml0b3IgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgYWZ0ZXIgdGFibGUgbG9hZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIHdoZW4gZGF0YSBpcyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgb25EYXRhTG9hZGVkKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEV4dHJhY3QgZGF0YSBmcm9tIHJlc3BvbnNlXG4gICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhIHx8IFtdO1xuICAgICAgICBjb25zdCBoYXNQcm92aWRlcnMgPSBkYXRhLmxlbmd0aCA+IDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzUHJvdmlkZXJzKSB7XG4gICAgICAgICAgICAvLyBTaG93IHRhYmxlIGFuZCBidXR0b25zXG4gICAgICAgICAgICAkKCcjcHJvdmlkZXJzLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNhZGQtYnV0dG9ucy1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2FkZC1idXR0b25zLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciB0YWJsZSBkcmF3IGlzIGNvbXBsZXRlXG4gICAgICovXG4gICAgb25EcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgIC8vIE1vdmUgYWRkIGJ1dHRvbnMgZ3JvdXAgdG8gRGF0YVRhYmxlcyB3cmFwcGVyIChuZXh0IHRvIHNlYXJjaClcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbnNHcm91cCA9ICQoJyNhZGQtYnV0dG9ucy1ncm91cCcpO1xuICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoJyNwcm92aWRlcnMtdGFibGVfd3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkbGVmdENvbHVtbiA9ICR3cmFwcGVyLmZpbmQoJy5laWdodC53aWRlLmNvbHVtbicpLmZpcnN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGFkZEJ1dHRvbnNHcm91cC5sZW5ndGggJiYgJGxlZnRDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbnNHcm91cCk7XG4gICAgICAgICAgICAvLyBTaG93IGJ1dHRvbnMgb25seSBpZiB0YWJsZSBoYXMgZGF0YVxuICAgICAgICAgICAgY29uc3QgaGFzRGF0YSA9ICQoJyNwcm92aWRlcnMtdGFibGUnKS5EYXRhVGFibGUoKS5kYXRhKCkuYW55KCk7XG4gICAgICAgICAgICBpZiAoaGFzRGF0YSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b25zR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcm93IGRhdGEgYXR0cmlidXRlcyBmb3IgZWFjaCBwcm92aWRlclxuICAgICAgICAkKCcjcHJvdmlkZXJzLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAkKCcjcHJvdmlkZXJzLXRhYmxlJykuRGF0YVRhYmxlKCkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdpZCcsIGRhdGEuaWQpO1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignZGF0YS12YWx1ZScsICdtb2RpZnknICsgZGF0YS50eXBlLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignZGF0YS1saW5rcycsIGRhdGEubGlua3MgfHwgJ2ZhbHNlJyk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcygncHJvdmlkZXItcm93Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGRpc2FiaWxpdHkgY2xhc3MgdG8gc3BlY2lmaWMgY2VsbHMgaWYgcHJvdmlkZXIgaXMgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGlzYWJpbGl0eSBhbmQgZGlzYWJsZWQgY2xhc3NlcyB0byBkYXRhIGNlbGxzIChub3QgY2hlY2tib3ggYW5kIGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZmluZCgndGQnKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkdGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG90YWxDb2x1bW5zID0gJCh0aGlzKS5wYXJlbnQoKS5maW5kKCd0ZCcpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgZmlyc3QgY29sdW1uIChjaGVja2JveCkgYW5kIGxhc3QgY29sdW1uIChhY3Rpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCAmJiBpbmRleCA8IHRvdGFsQ29sdW1ucyAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGQuYWRkQ2xhc3MoJ2Rpc2FiaWxpdHkgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hlc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDaGVja2JveGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWZyZXNoIFByb3ZpZGVyU3RhdHVzTW9uaXRvciBjYWNoZSBhZnRlciBET00gY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnJlZnJlc2hDYWNoZSkge1xuICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnJlZnJlc2hDYWNoZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVuYWJsZS9kaXNhYmxlIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2hlY2tib3hlcygpIHtcbiAgICAgICAgJCgnLnByb3ZpZGVyLXJvdyAuY2hlY2tib3gnKVxuICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICBvbkNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCdWlsZCBkYXRhIG9iamVjdCAtIGV4dHJhY3QgYWN0dWFsIHR5cGUgZnJvbSBkYXRhLXZhbHVlIChyZW1vdmUgJ21vZGlmeScgcHJlZml4KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxUeXBlID0gdHlwZS5yZXBsYWNlKC9ebW9kaWZ5L2ksICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBhY3R1YWxUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgUkVTVCBBUEkgdjMgdG8gdXBkYXRlIHByb3ZpZGVyIHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICBQcm92aWRlcnNBUEkudXBkYXRlU3RhdHVzKHByb3ZpZGVySWQsIGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkaXNhYmlsaXR5IGNsYXNzZXMgZnJvbSBjZWxsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke3Byb3ZpZGVySWR9IHRkYCkucmVtb3ZlQ2xhc3MoJ2Rpc2FiaWxpdHkgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCdWlsZCBkYXRhIG9iamVjdCAtIGV4dHJhY3QgYWN0dWFsIHR5cGUgZnJvbSBkYXRhLXZhbHVlIChyZW1vdmUgJ21vZGlmeScgcHJlZml4KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxUeXBlID0gdHlwZS5yZXBsYWNlKC9ebW9kaWZ5L2ksICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBhY3R1YWxUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB2MyB0byB1cGRhdGUgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIFByb3ZpZGVyc0FQSS51cGRhdGVTdGF0dXMocHJvdmlkZXJJZCwgZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRpc2FiaWxpdHkgYW5kIGRpc2FibGVkIGNsYXNzZXMgdG8gZGF0YSBjZWxsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke3Byb3ZpZGVySWR9IHRkYCkuZWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvbHVtbnMgPSAkKGAjJHtwcm92aWRlcklkfSB0ZGApLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBmaXJzdCBjb2x1bW4gKGNoZWNrYm94KSBhbmQgbGFzdCBjb2x1bW4gKGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDAgJiYgaW5kZXggPCB0b3RhbENvbHVtbnMgLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdkaXNhYmlsaXR5IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgcHJvdmlkZXIgZGVsZXRpb25cbiAgICAgKiBSZXN0b3JlcyBwcm92aWRlciBzdGF0dXNlcyBhZnRlciB0YWJsZSByZWxvYWRcbiAgICAgKi9cbiAgICBvbkFmdGVyRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgICAgLy8gUmVxdWVzdCBmcmVzaCBwcm92aWRlciBzdGF0dXNlcyBhZnRlciBkZWxldGlvblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgfSwgMzAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBwcm92aWRlciBzdGF0dXMgb24gcGFnZSBsb2FkXG4gICAgICovXG4gICAgcmVxdWVzdEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXNlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IHRyaWdnZXIgc3RhdHVzIHVwZGF0ZVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgdHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IudXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVycyBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXJzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==