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

/* global globalRootUrl, globalTranslate, ProvidersAPI, SecurityUtils, SemanticLocalization, PbxDataTableIndex, UserMessage, ProviderStatusMonitor */

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
      actionButtons: ['edit', 'delete'],
      // No copy button for providers
      ajaxData: {
        includeDisabled: 'true' // Always include disabled providers in admin panel

      },
      translations: {
        deleteError: globalTranslate.pr_ImpossibleToDeleteProvider
      },
      onDataLoaded: this.onDataLoaded.bind(this),
      onDrawCallback: this.onDrawCallback.bind(this),
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
            // Use SecurityUtils.sanitizeExtensionsApiContent to allow safe HTML rendering
            var safeRepresentation = window.SecurityUtils.sanitizeExtensionsApiContent(data || '');
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

    this.initializeCheckboxes(); // Override delete handler to check for links ONLY on second click (after two-steps confirmation)
    // Don't handle clicks on elements with two-steps-delete class - let delete-something.js handle them first

    $('.provider-row a.delete:not(.two-steps-delete)').off('click').on('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var providerId = $(e.target).closest('a').attr('data-value');
      var linksExist = $(e.target).closest('tr').attr('data-links');

      if (linksExist === 'true') {
        providers.$deleteModalForm.modal({
          closable: false,
          onDeny: function onDeny() {
            return true;
          },
          onApprove: function onApprove() {
            providers.deleteProvider(providerId);
            return true;
          }
        }).modal('show');
      } else {
        providers.deleteProvider(providerId);
      }
    });
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
        }; // Use REST API to update (will be detected as status-only update)

        ProvidersAPI.saveRecord(data, function (response) {
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
        }; // Use REST API to update (will be detected as status-only update)

        ProvidersAPI.saveRecord(data, function (response) {
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
   * Delete provider using REST API
   * 
   * @param {string} providerId - Provider ID to delete
   */
  deleteProvider: function deleteProvider(providerId) {
    var _this4 = this;

    ProvidersAPI.deleteRecord(providerId, function (response) {
      if (response.result) {
        // Reload table data
        _this4.dataTableInstance.dataTable.ajax.reload();
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsImRhdGFUYWJsZUluc3RhbmNlIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiQiLCJpbml0aWFsaXplIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiUGJ4RGF0YVRhYmxlSW5kZXgiLCJ0YWJsZUlkIiwiYXBpTW9kdWxlIiwiUHJvdmlkZXJzQVBJIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwiYWN0aW9uQnV0dG9ucyIsImFqYXhEYXRhIiwiaW5jbHVkZURpc2FibGVkIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9JbXBvc3NpYmxlVG9EZWxldGVQcm92aWRlciIsIm9uRGF0YUxvYWRlZCIsImJpbmQiLCJvbkRyYXdDYWxsYmFjayIsIm9yZGVyIiwiY29sdW1ucyIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwidHlwZSIsInJvdyIsImRpc2FibGVkIiwiY2hlY2tlZCIsInNhZmVSZXByZXNlbnRhdGlvbiIsIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50Iiwibm90ZSIsImZpbHRlciIsIkJvb2xlYW4iLCJqb2luIiwiaG9zdCIsImVzY2FwZUh0bWwiLCJ1c2VybmFtZSIsImdldE1vZGlmeVVybCIsInJlY29yZElkIiwiZGF0YVRhYmxlIiwicm93cyIsInRvQXJyYXkiLCJyZWNvcmQiLCJmaW5kIiwiciIsImlkIiwidG9Mb3dlckNhc2UiLCJnbG9iYWxSb290VXJsIiwiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwic2V0VGltZW91dCIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwicmVzcG9uc2UiLCJoYXNQcm92aWRlcnMiLCJsZW5ndGgiLCJzaG93IiwiaGlkZSIsIiRhZGRCdXR0b25zR3JvdXAiLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiZmlyc3QiLCJhcHBlbmQiLCJoYXNEYXRhIiwiRGF0YVRhYmxlIiwiYW55IiwiZWFjaCIsImF0dHIiLCJsaW5rcyIsImFkZENsYXNzIiwiaW5kZXgiLCIkdGQiLCJ0b3RhbENvbHVtbnMiLCJwYXJlbnQiLCJpbml0aWFsaXplQ2hlY2tib3hlcyIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwicHJvdmlkZXJJZCIsInRhcmdldCIsImNsb3Nlc3QiLCJsaW5rc0V4aXN0IiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJkZWxldGVQcm92aWRlciIsImNoZWNrYm94Iiwib25DaGVja2VkIiwiYWN0dWFsVHlwZSIsInJlcGxhY2UiLCJ0b1VwcGVyQ2FzZSIsInNhdmVSZWNvcmQiLCJyZXN1bHQiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJvblVuY2hlY2tlZCIsImRlbGV0ZVJlY29yZCIsImFqYXgiLCJyZWxvYWQiLCJnZXRTdGF0dXNlcyIsInVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNkO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQUpMOztBQU1kO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBVEw7O0FBV2Q7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZGMsd0JBY0Q7QUFDVDtBQUNBSixJQUFBQSxTQUFTLENBQUNFLGdCQUFWLENB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RUFBQUEsU0FBUyxDQUFDSSxVQUFWO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFByb3ZpZGVyc0FQSSwgU2VjdXJpdHlVdGlscywgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieERhdGFUYWJsZUluZGV4LCBVc2VyTWVzc2FnZSwgUHJvdmlkZXJTdGF0dXNNb25pdG9yICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBwcm92aWRlcnMgdGFibGVcbiAqXG4gKiBAbW9kdWxlIHByb3ZpZGVyc1xuICovXG5jb25zdCBwcm92aWRlcnMgPSB7XG4gICAgLyoqXG4gICAgICogRGF0YVRhYmxlIGluc3RhbmNlIGZyb20gYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGRhdGFUYWJsZUluc3RhbmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIG1vZGFsIGZvcm1cbiAgICAgKi9cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVsZXRlIG1vZGFsXG4gICAgICAgIHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwcm92aWRlcnMgdGFibGUgd2l0aCBSRVNUIEFQSVxuICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIHVzaW5nIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2Ugb2YgYmFzZSBjbGFzcyB3aXRoIFByb3ZpZGVycyBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UgPSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXgoe1xuICAgICAgICAgICAgdGFibGVJZDogJ3Byb3ZpZGVycy10YWJsZScsXG4gICAgICAgICAgICBhcGlNb2R1bGU6IFByb3ZpZGVyc0FQSSxcbiAgICAgICAgICAgIHJvdXRlUHJlZml4OiAncHJvdmlkZXJzJyxcbiAgICAgICAgICAgIHNob3dTdWNjZXNzTWVzc2FnZXM6IGZhbHNlLFxuICAgICAgICAgICAgYWN0aW9uQnV0dG9uczogWydlZGl0JywgJ2RlbGV0ZSddLCAvLyBObyBjb3B5IGJ1dHRvbiBmb3IgcHJvdmlkZXJzXG4gICAgICAgICAgICBhamF4RGF0YToge1xuICAgICAgICAgICAgICAgIGluY2x1ZGVEaXNhYmxlZDogJ3RydWUnICAvLyBBbHdheXMgaW5jbHVkZSBkaXNhYmxlZCBwcm92aWRlcnMgaW4gYWRtaW4gcGFuZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBkZWxldGVFcnJvcjogZ2xvYmFsVHJhbnNsYXRlLnByX0ltcG9zc2libGVUb0RlbGV0ZVByb3ZpZGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EYXRhTG9hZGVkOiB0aGlzLm9uRGF0YUxvYWRlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25EcmF3Q2FsbGJhY2s6IHRoaXMub25EcmF3Q2FsbGJhY2suYmluZCh0aGlzKSxcbiAgICAgICAgICAgIG9yZGVyOiBbWzAsICdhc2MnXV0sIC8vIERlZmF1bHQgc29ydGluZyBieSBzdGF0dXMgKGVuYWJsZWQgZmlyc3QpXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUvZGlzYWJsZSBjaGVja2JveCBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2Rpc2FibGVkJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnc29ydCcgfHwgdHlwZSA9PT0gJ3R5cGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIDAgZm9yIGVuYWJsZWQsIDEgZm9yIGRpc2FibGVkIGZvciBzb3J0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5kaXNhYmxlZCA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICFyb3cuZGlzYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCB0b2dnbGUgY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiICR7Y2hlY2tlZH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0YXR1cyBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NlbnRlciBhbGlnbmVkIGNvbGxhcHNpbmcgcHJvdmlkZXItc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgbmFtZSBjb2x1bW4gLSBkaXNwbGF5IHdoYXQgY29tZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3JlcHJlc2VudCcsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXIoZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCB0byBhbGxvdyBzYWZlIEhUTUwgcmVuZGVyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVJlcHJlc2VudGF0aW9uID0gd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChkYXRhIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuPiR7c2FmZVJlcHJlc2VudGF0aW9ufTwvc3Bhbj48YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlcyBmYWlsdXJlXCI+PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzZWFyY2ggYW5kIG90aGVyIG9wZXJhdGlvbnMsIHJldHVybiBwbGFpbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2RhdGEsIHJvdy5ub3RlLCByb3cudHlwZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvLyBIb3N0IGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBob3N0ID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4+JHtob3N0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZXJuYW1lIGNvbHVtblxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdoaWRlLW9uLW1vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1c2VybmFtZSA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuPiR7dXNlcm5hbWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgLy8gQ3VzdG9tIFVSTCBnZW5lcmF0b3IgZm9yIG1vZGlmeS9lZGl0IGFjdGlvbnNcbiAgICAgICAgICAgIGdldE1vZGlmeVVybChyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3dzKCkuZGF0YSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmQgPSBkYXRhLmZpbmQociA9PiByLmlkID09PSByZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gcmVjb3JkLnR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeSR7dHlwZX0vJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBiYXNlIGNsYXNzXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBzdGF0dXMgbW9uaXRvciBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1cyBhZnRlciB0YWJsZSBsb2Fkc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgd2hlbiBkYXRhIGlzIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBvbkRhdGFMb2FkZWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwgW107XG4gICAgICAgIGNvbnN0IGhhc1Byb3ZpZGVycyA9IGRhdGEubGVuZ3RoID4gMDtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNQcm92aWRlcnMpIHtcbiAgICAgICAgICAgIC8vIFNob3cgdGFibGUgYW5kIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUtY29udGFpbmVyJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2FkZC1idXR0b25zLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJCgnI3Byb3ZpZGVycy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLWJ1dHRvbnMtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHRhYmxlIGRyYXcgaXMgY29tcGxldGVcbiAgICAgKi9cbiAgICBvbkRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gTW92ZSBhZGQgYnV0dG9ucyBncm91cCB0byBEYXRhVGFibGVzIHdyYXBwZXIgKG5leHQgdG8gc2VhcmNoKVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uc0dyb3VwID0gJCgnI2FkZC1idXR0b25zLWdyb3VwJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJCgnI3Byb3ZpZGVycy10YWJsZV93cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uc0dyb3VwLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uc0dyb3VwKTtcbiAgICAgICAgICAgIC8vIFNob3cgYnV0dG9ucyBvbmx5IGlmIHRhYmxlIGhhcyBkYXRhXG4gICAgICAgICAgICBjb25zdCBoYXNEYXRhID0gJCgnI3Byb3ZpZGVycy10YWJsZScpLkRhdGFUYWJsZSgpLmRhdGEoKS5hbnkoKTtcbiAgICAgICAgICAgIGlmIChoYXNEYXRhKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbnNHcm91cC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByb3cgZGF0YSBhdHRyaWJ1dGVzIGZvciBlYWNoIHByb3ZpZGVyXG4gICAgICAgICQoJyNwcm92aWRlcnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9ICQoJyNwcm92aWRlcnMtdGFibGUnKS5EYXRhVGFibGUoKS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2lkJywgZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJywgJ21vZGlmeScgKyBkYXRhLnR5cGUudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLWxpbmtzJywgZGF0YS5saW5rcyB8fCAnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdwcm92aWRlci1yb3cnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGlzYWJpbGl0eSBjbGFzcyB0byBzcGVjaWZpYyBjZWxscyBpZiBwcm92aWRlciBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkaXNhYmlsaXR5IGFuZCBkaXNhYmxlZCBjbGFzc2VzIHRvIGRhdGEgY2VsbHMgKG5vdCBjaGVja2JveCBhbmQgYWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCd0ZCcpLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICR0ZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvbHVtbnMgPSAkKHRoaXMpLnBhcmVudCgpLmZpbmQoJ3RkJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBmaXJzdCBjb2x1bW4gKGNoZWNrYm94KSBhbmQgbGFzdCBjb2x1bW4gKGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwICYmIGluZGV4IDwgdG90YWxDb2x1bW5zIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0ZC5hZGRDbGFzcygnZGlzYWJpbGl0eSBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbmFibGUvZGlzYWJsZSBjaGVja2JveGVzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNoZWNrYm94ZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE92ZXJyaWRlIGRlbGV0ZSBoYW5kbGVyIHRvIGNoZWNrIGZvciBsaW5rcyBPTkxZIG9uIHNlY29uZCBjbGljayAoYWZ0ZXIgdHdvLXN0ZXBzIGNvbmZpcm1hdGlvbilcbiAgICAgICAgLy8gRG9uJ3QgaGFuZGxlIGNsaWNrcyBvbiBlbGVtZW50cyB3aXRoIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgLSBsZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlbSBmaXJzdFxuICAgICAgICAkKCcucHJvdmlkZXItcm93IGEuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmtzRXhpc3QgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtbGlua3MnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGxpbmtzRXhpc3QgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtXG4gICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcnMuZGVsZXRlUHJvdmlkZXIocHJvdmlkZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXJzLmRlbGV0ZVByb3ZpZGVyKHByb3ZpZGVySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcucHJvdmlkZXItcm93IC5jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGRhdGEgb2JqZWN0IC0gZXh0cmFjdCBhY3R1YWwgdHlwZSBmcm9tIGRhdGEtdmFsdWUgKHJlbW92ZSAnbW9kaWZ5JyBwcmVmaXgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSB0eXBlLnJlcGxhY2UoL15tb2RpZnkvaSwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFjdHVhbFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBSRVNUIEFQSSB0byB1cGRhdGUgKHdpbGwgYmUgZGV0ZWN0ZWQgYXMgc3RhdHVzLW9ubHkgdXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBQcm92aWRlcnNBUEkuc2F2ZVJlY29yZChkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGlzYWJpbGl0eSBjbGFzc2VzIGZyb20gY2VsbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtwcm92aWRlcklkfSB0ZGApLnJlbW92ZUNsYXNzKCdkaXNhYmlsaXR5IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldmVydCBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQnVpbGQgZGF0YSBvYmplY3QgLSBleHRyYWN0IGFjdHVhbCB0eXBlIGZyb20gZGF0YS12YWx1ZSAocmVtb3ZlICdtb2RpZnknIHByZWZpeClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsVHlwZSA9IHR5cGUucmVwbGFjZSgvXm1vZGlmeS9pLCAnJykudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBwcm92aWRlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYWN0dWFsVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgUkVTVCBBUEkgdG8gdXBkYXRlICh3aWxsIGJlIGRldGVjdGVkIGFzIHN0YXR1cy1vbmx5IHVwZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgUHJvdmlkZXJzQVBJLnNhdmVSZWNvcmQoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRpc2FiaWxpdHkgYW5kIGRpc2FibGVkIGNsYXNzZXMgdG8gZGF0YSBjZWxsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke3Byb3ZpZGVySWR9IHRkYCkuZWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvbHVtbnMgPSAkKGAjJHtwcm92aWRlcklkfSB0ZGApLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBmaXJzdCBjb2x1bW4gKGNoZWNrYm94KSBhbmQgbGFzdCBjb2x1bW4gKGFjdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDAgJiYgaW5kZXggPCB0b3RhbENvbHVtbnMgLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdkaXNhYmlsaXR5IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwcm92aWRlciB1c2luZyBSRVNUIEFQSVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlcklkIC0gUHJvdmlkZXIgSUQgdG8gZGVsZXRlXG4gICAgICovXG4gICAgZGVsZXRlUHJvdmlkZXIocHJvdmlkZXJJZCkge1xuICAgICAgICBQcm92aWRlcnNBUEkuZGVsZXRlUmVjb3JkKHByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUuYWpheC5yZWxvYWQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgcHJvdmlkZXIgc3RhdHVzIG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBNYW51YWxseSB0cmlnZ2VyIHN0YXR1cyB1cGRhdGVcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlcnMgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHByb3ZpZGVycy5pbml0aWFsaXplKCk7XG59KTsiXX0=