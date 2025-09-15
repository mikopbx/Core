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
            var safeRepresentation = window.SecurityUtils.sanitizeForDisplay(data || '', false);
            return "<span>".concat(safeRepresentation, "</span><br><span class=\"features failure\"></span>");
          } // For search and other operations, return plain text


          return [data, row.note, row.type].filter(Boolean).join(' ');
        }
      }, {
        // Host column
        data: 'host',
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
        }; // Use REST API v3 to update provider

        ProvidersAPI.patch(providerId, data, function (response) {
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
        }; // Use REST API v3 to update provider

        ProvidersAPI.patch(providerId, data, function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsImRhdGFUYWJsZUluc3RhbmNlIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiQiLCJpbml0aWFsaXplIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiUGJ4RGF0YVRhYmxlSW5kZXgiLCJ0YWJsZUlkIiwiYXBpTW9kdWxlIiwiUHJvdmlkZXJzQVBJIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwiYWN0aW9uQnV0dG9ucyIsImFqYXhEYXRhIiwiaW5jbHVkZURpc2FibGVkIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9JbXBvc3NpYmxlVG9EZWxldGVQcm92aWRlciIsIm9uRGF0YUxvYWRlZCIsImJpbmQiLCJvbkRyYXdDYWxsYmFjayIsIm9uQWZ0ZXJEZWxldGUiLCJvbkFmdGVyRGVsZXRlU3VjY2VzcyIsIm9yZGVyIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwidHlwZSIsInJvdyIsImRpc2FibGVkIiwiY2hlY2tlZCIsInNhZmVSZXByZXNlbnRhdGlvbiIsIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUZvckRpc3BsYXkiLCJub3RlIiwiZmlsdGVyIiwiQm9vbGVhbiIsImpvaW4iLCJob3N0IiwiZXNjYXBlSHRtbCIsInVzZXJuYW1lIiwiZ2V0TW9kaWZ5VXJsIiwicmVjb3JkSWQiLCJkYXRhVGFibGUiLCJyb3dzIiwidG9BcnJheSIsInJlY29yZCIsImZpbmQiLCJyIiwiaWQiLCJ0b0xvd2VyQ2FzZSIsImdsb2JhbFJvb3RVcmwiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwiY2FsbGJhY2siLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJkZWxldGVSZWNvcmQiLCJyZXN1bHQiLCJtZXNzYWdlcyIsImVycm9yIiwiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwic2V0VGltZW91dCIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwicmVzcG9uc2UiLCJoYXNQcm92aWRlcnMiLCJsZW5ndGgiLCJzaG93IiwiaGlkZSIsIiRhZGRCdXR0b25zR3JvdXAiLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiZmlyc3QiLCJhcHBlbmQiLCJoYXNEYXRhIiwiRGF0YVRhYmxlIiwiYW55IiwiZWFjaCIsImF0dHIiLCJsaW5rcyIsImFkZENsYXNzIiwiaW5kZXgiLCIkdGQiLCJ0b3RhbENvbHVtbnMiLCJwYXJlbnQiLCJpbml0aWFsaXplQ2hlY2tib3hlcyIsInJlZnJlc2hDYWNoZSIsImNoZWNrYm94Iiwib25DaGVja2VkIiwicHJvdmlkZXJJZCIsImNsb3Nlc3QiLCJhY3R1YWxUeXBlIiwicmVwbGFjZSIsInRvVXBwZXJDYXNlIiwicGF0Y2giLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwib25VbmNoZWNrZWQiLCJnZXRTdGF0dXNlcyIsInVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQUpMOztBQU1kO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBVEw7O0FBV2Q7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZGMsd0JBY0Q7QUFDVDtBQUNBSixJQUFBQSxTQUFTLENBQUNFLGdCQUFWLENBQTJCRyxLQUEzQixHQUZTLENBSVQ7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QkFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRa0YsUUFBUixDQUFpQixxQkFBakI7QUFDSDtBQUNKLGFBTkQ7QUFPSCxXQVRELE1BU087QUFDSDtBQUNBbEYsWUFBQUEsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFReUYsUUFBUixDQUFpQixhQUFqQjtBQUNBUyxZQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJqQyxRQUFRLENBQUNMLFFBQXJDO0FBQ0g7QUFDSixTQWZEO0FBZ0JIO0FBdERLLEtBRGQ7QUF5REgsR0E1UmE7O0FBOFJkO0FBQ0o7QUFDQTtBQUNBO0FBQ0l4QyxFQUFBQSxvQkFsU2Msa0NBa1NTO0FBQUE7O0FBQ25CO0FBQ0EyQyxJQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiLE1BQUEsTUFBSSxDQUFDQyxvQkFBTDtBQUNILEtBRlMsRUFFUCxHQUZPLENBQVY7QUFHSCxHQXZTYTs7QUF5U2Q7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG9CQTVTYyxrQ0E0U1M7QUFDbkIxRCxJQUFBQSxZQUFZLENBQUM4RixXQUFiLENBQXlCLFVBQUNuQyxRQUFELEVBQWM7QUFDbkM7QUFDQSxVQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQzFDLElBQXJCLElBQTZCLE9BQU91QyxxQkFBUCxLQUFpQyxXQUFsRSxFQUErRTtBQUMzRUEsUUFBQUEscUJBQXFCLENBQUN1Qyx5QkFBdEIsQ0FBZ0RwQyxRQUFRLENBQUMxQyxJQUF6RDtBQUNIO0FBQ0osS0FMRDtBQU1IO0FBblRhLENBQWxCO0FBc1RBO0FBQ0E7QUFDQTs7QUFDQXhCLENBQUMsQ0FBQ3VHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIzRyxFQUFBQSxTQUFTLENBQUNJLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgUHJvdmlkZXJzQVBJLCBTaXBQcm92aWRlcnNBUEksIElheFByb3ZpZGVyc0FQSSwgU2VjdXJpdHlVdGlscywgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieERhdGFUYWJsZUluZGV4LCBVc2VyTWVzc2FnZSwgUHJvdmlkZXJTdGF0dXNNb25pdG9yICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBwcm92aWRlcnMgdGFibGVcbiAqXG4gKiBAbW9kdWxlIHByb3ZpZGVyc1xuICovXG5jb25zdCBwcm92aWRlcnMgPSB7XG4gICAgLyoqXG4gICAgICogRGF0YVRhYmxlIGluc3RhbmNlIGZyb20gYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGRhdGFUYWJsZUluc3RhbmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIG1vZGFsIGZvcm1cbiAgICAgKi9cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVsZXRlIG1vZGFsXG4gICAgICAgIHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwcm92aWRlcnMgdGFibGUgd2l0aCBSRVNUIEFQSVxuICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIHVzaW5nIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2Ugb2YgYmFzZSBjbGFzcyB3aXRoIFByb3ZpZGVycyBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UgPSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXgoe1xuICAgICAgICAgICAgdGFibGVJZDogJ3Byb3ZpZGVycy10YWJsZScsXG4gICAgICAgICAgICBhcGlNb2R1bGU6IFByb3ZpZGVyc0FQSSxcbiAgICAgICAgICAgIHJvdXRlUHJlZml4OiAncHJvdmlkZXJzJyxcbiAgICAgICAgICAgIHNob3dTdWNjZXNzTWVzc2FnZXM6IGZhbHNlLFxuICAgICAgICAgICAgYWN0aW9uQnV0dG9uczogWydlZGl0JywgJ2NvcHknLCAnZGVsZXRlJ10sIC8vIEluY2x1ZGUgY29weSBidXR0b24gZm9yIHByb3ZpZGVyc1xuICAgICAgICAgICAgYWpheERhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgZGVsZXRlRXJyb3I6IGdsb2JhbFRyYW5zbGF0ZS5wcl9JbXBvc3NpYmxlVG9EZWxldGVQcm92aWRlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRGF0YUxvYWRlZDogdGhpcy5vbkRhdGFMb2FkZWQuYmluZCh0aGlzKSxcbiAgICAgICAgICAgIG9uRHJhd0NhbGxiYWNrOiB0aGlzLm9uRHJhd0NhbGxiYWNrLmJpbmQodGhpcyksXG4gICAgICAgICAgICBvbkFmdGVyRGVsZXRlOiB0aGlzLm9uQWZ0ZXJEZWxldGVTdWNjZXNzLmJpbmQodGhpcyksIC8vIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgICAgICAgIG9yZGVyOiBbWzAsICdhc2MnXV0sIC8vIERlZmF1bHQgc29ydGluZyBieSBzdGF0dXMgKGVuYWJsZWQgZmlyc3QpXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUvZGlzYWJsZSBjaGVja2JveCBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2Rpc2FibGVkJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnc29ydCcgfHwgdHlwZSA9PT0gJ3R5cGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIDAgZm9yIGVuYWJsZWQsIDEgZm9yIGRpc2FibGVkIGZvciBzb3J0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5kaXNhYmxlZCA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICFyb3cuZGlzYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCB0b2dnbGUgY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiICR7Y2hlY2tlZH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0YXR1cyBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NlbnRlciBhbGlnbmVkIGNvbGxhcHNpbmcgcHJvdmlkZXItc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgbmFtZSBjb2x1bW4gLSBkaXNwbGF5IHdoYXQgY29tZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3JlcHJlc2VudCcsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXIoZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVGb3JEaXNwbGF5IHdpdGggbGVzcyBzdHJpY3QgbW9kZSBmb3IgcHJvdmlkZXIgaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlUmVwcmVzZW50YXRpb24gPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUZvckRpc3BsYXkoZGF0YSB8fCAnJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4+JHtzYWZlUmVwcmVzZW50YXRpb259PC9zcGFuPjxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzIGZhaWx1cmVcIj48L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbZGF0YSwgcm93Lm5vdGUsIHJvdy50eXBlXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhvc3QgY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdob3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvc3QgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Bhbj4ke2hvc3R9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlcm5hbWUgY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJuYW1lID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4+JHt1c2VybmFtZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAvLyBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAgICAgICAgZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvd3MoKS5kYXRhKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZCA9IGRhdGEuZmluZChyID0+IHIuaWQgPT09IHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSByZWNvcmQudHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5JHt0eXBlfS8ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIEN1c3RvbSBkZWxldGUgaGFuZGxlciB0byB1c2UgY29ycmVjdCBBUEkgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICAgICAgY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhVGFibGUucm93cygpLmRhdGEoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gZGF0YS5maW5kKHIgPT4gci5pZCA9PT0gcmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHR5cGUtc3BlY2lmaWMgQVBJIGZvciBkZWxldGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcGlNb2R1bGUgPSByZWNvcmQudHlwZSA9PT0gJ1NJUCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgICAgICAgICAgICAgIGFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWNvcmQgbm90IGZvdW5kIGluIHRhYmxlIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnUHJvdmlkZXIgbm90IGZvdW5kIGluIHRhYmxlJ119XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBiYXNlIGNsYXNzXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBzdGF0dXMgbW9uaXRvciBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1cyBhZnRlciB0YWJsZSBsb2Fkc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgd2hlbiBkYXRhIGlzIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBvbkRhdGFMb2FkZWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwgW107XG4gICAgICAgIGNvbnN0IGhhc1Byb3ZpZGVycyA9IGRhdGEubGVuZ3RoID4gMDtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNQcm92aWRlcnMpIHtcbiAgICAgICAgICAgIC8vIFNob3cgdGFibGUgYW5kIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUtY29udGFpbmVyJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2FkZC1idXR0b25zLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJCgnI3Byb3ZpZGVycy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLWJ1dHRvbnMtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHRhYmxlIGRyYXcgaXMgY29tcGxldGVcbiAgICAgKi9cbiAgICBvbkRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gTW92ZSBhZGQgYnV0dG9ucyBncm91cCB0byBEYXRhVGFibGVzIHdyYXBwZXIgKG5leHQgdG8gc2VhcmNoKVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uc0dyb3VwID0gJCgnI2FkZC1idXR0b25zLWdyb3VwJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJCgnI3Byb3ZpZGVycy10YWJsZV93cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uc0dyb3VwLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uc0dyb3VwKTtcbiAgICAgICAgICAgIC8vIFNob3cgYnV0dG9ucyBvbmx5IGlmIHRhYmxlIGhhcyBkYXRhXG4gICAgICAgICAgICBjb25zdCBoYXNEYXRhID0gJCgnI3Byb3ZpZGVycy10YWJsZScpLkRhdGFUYWJsZSgpLmRhdGEoKS5hbnkoKTtcbiAgICAgICAgICAgIGlmIChoYXNEYXRhKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbnNHcm91cC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByb3cgZGF0YSBhdHRyaWJ1dGVzIGZvciBlYWNoIHByb3ZpZGVyXG4gICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9ICQoJyNwcm92aWRlcnMtdGFibGUnKS5EYXRhVGFibGUoKS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2lkJywgZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJywgJ21vZGlmeScgKyBkYXRhLnR5cGUudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLWxpbmtzJywgZGF0YS5saW5rcyB8fCAnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdwcm92aWRlci1yb3cnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGlzYWJpbGl0eSBjbGFzcyB0byBzcGVjaWZpYyBjZWxscyBpZiBwcm92aWRlciBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkaXNhYmlsaXR5IGFuZCBkaXNhYmxlZCBjbGFzc2VzIHRvIGRhdGEgY2VsbHMgKG5vdCBjaGVja2JveCBhbmQgYWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCd0ZCcpLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICR0ZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvbHVtbnMgPSAkKHRoaXMpLnBhcmVudCgpLmZpbmQoJ3RkJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBmaXJzdCBjb2x1bW4gKGNoZWNrYm94KSBhbmQgbGFzdCBjb2x1bW4gKGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIGluZGV4IDwgdG90YWxDb2x1bW5zIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0ZC5hZGRDbGFzcygnZGlzYWJpbGl0eSBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbmFibGUvZGlzYWJsZSBjaGVja2JveGVzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNoZWNrYm94ZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggUHJvdmlkZXJTdGF0dXNNb25pdG9yIGNhY2hlIGFmdGVyIERPTSBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQcm92aWRlclN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKSB7XG4gICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcucHJvdmlkZXItcm93IC5jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGRhdGEgb2JqZWN0IC0gZXh0cmFjdCBhY3R1YWwgdHlwZSBmcm9tIGRhdGEtdmFsdWUgKHJlbW92ZSAnbW9kaWZ5JyBwcmVmaXgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSB0eXBlLnJlcGxhY2UoL15tb2RpZnkvaSwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFjdHVhbFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB2MyB0byB1cGRhdGUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgUHJvdmlkZXJzQVBJLnBhdGNoKHByb3ZpZGVySWQsIGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkaXNhYmlsaXR5IGNsYXNzZXMgZnJvbSBjZWxsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke3Byb3ZpZGVySWR9IHRkYCkucmVtb3ZlQ2xhc3MoJ2Rpc2FiaWxpdHkgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCdWlsZCBkYXRhIG9iamVjdCAtIGV4dHJhY3QgYWN0dWFsIHR5cGUgZnJvbSBkYXRhLXZhbHVlIChyZW1vdmUgJ21vZGlmeScgcHJlZml4KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxUeXBlID0gdHlwZS5yZXBsYWNlKC9ebW9kaWZ5L2ksICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBhY3R1YWxUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB2MyB0byB1cGRhdGUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgUHJvdmlkZXJzQVBJLnBhdGNoKHByb3ZpZGVySWQsIGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkaXNhYmlsaXR5IGFuZCBkaXNhYmxlZCBjbGFzc2VzIHRvIGRhdGEgY2VsbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtwcm92aWRlcklkfSB0ZGApLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG90YWxDb2x1bW5zID0gJChgIyR7cHJvdmlkZXJJZH0gdGRgKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgZmlyc3QgY29sdW1uIChjaGVja2JveCkgYW5kIGxhc3QgY29sdW1uIChhY3Rpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIGluZGV4IDwgdG90YWxDb2x1bW5zIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcygnZGlzYWJpbGl0eSBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldmVydCBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBzdWNjZXNzZnVsIHByb3ZpZGVyIGRlbGV0aW9uXG4gICAgICogUmVzdG9yZXMgcHJvdmlkZXIgc3RhdHVzZXMgYWZ0ZXIgdGFibGUgcmVsb2FkXG4gICAgICovXG4gICAgb25BZnRlckRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICAgIC8vIFJlcXVlc3QgZnJlc2ggcHJvdmlkZXIgc3RhdHVzZXMgYWZ0ZXIgZGVsZXRpb25cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIH0sIDMwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgcHJvdmlkZXIgc3RhdHVzIG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBNYW51YWxseSB0cmlnZ2VyIHN0YXR1cyB1cGRhdGVcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlcnMgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHByb3ZpZGVycy5pbml0aWFsaXplKCk7XG59KTsiXX0=