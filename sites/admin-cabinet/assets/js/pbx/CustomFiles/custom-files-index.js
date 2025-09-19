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

/*
 * Custom Files table management module using unified base class
 *
 * Implements DataTable with Semantic UI following guidelines,
 * loads data via REST API v3, and follows MikoPBX standards.
 */

/* global globalRootUrl, customFilesAPI, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex */

/**
 * Module for handling interactions with the custom files table.
 * @module customFilesTable
 */
var customFilesTable = {
  /**
   * DataTable instance from base class
   */
  dataTableInstance: null,

  /**
   * jQuery object for the page length dropdown
   */
  $pageLengthDropdown: $('#page-length-select'),

  /**
   * Initializes the custom files table, applying DataTable features and setting up event handlers.
   */
  initialize: function initialize() {
    // Initialize dropdown for page length selection
    customFilesTable.initializePageLengthDropdown(); // Create instance of base class with Custom Files specific configuration

    this.dataTableInstance = new PbxDataTableIndex({
      tableId: 'custom-files-table',
      apiModule: customFilesAPI,
      apiMethod: 'getRecords',
      // Use the standard method name
      routePrefix: 'custom-files',
      showSuccessMessages: false,
      // Silent operation - following MikoPBX standards
      showInfo: true,
      // Show DataTable info for pagination
      actionButtons: ['edit', 'delete'],
      // Edit and delete buttons for custom files
      translations: {
        deleteError: globalTranslate.cf_ImpossibleToDeleteFile,
        deleteDisabledTooltip: globalTranslate.cf_CannotDeleteSystemFile || 'System files cannot be deleted'
      },
      // Custom delete permission check - only allow delete for custom mode files
      customDeletePermissionCheck: function customDeletePermissionCheck(row) {
        // Only allow deletion of files with mode === 'custom'
        return row.mode === 'custom';
      },
      dataTableOptions: {
        paging: true,
        // Enable pagination
        pageLength: customFilesTable.calculatePageLength(),
        // Calculate initial page length
        lengthMenu: [[25, 100], [25, 100]],
        // Page size options - simplified
        lengthChange: false,
        // We use custom dropdown instead of built-in
        pagingType: 'simple_numbers',
        // Show page numbers
        searching: true,
        // Enable searching functionality
        dom: 'rtip' // Remove filter (f) and length (l) from DOM, keep only processing (r), table (t), info (i), pagination (p)

      },
      columns: [{
        data: 'filepath',
        render: function render(data, type, row) {
          if (type === 'display') {
            return data || '—';
          }

          return data || '';
        }
      }, {
        data: 'mode',
        className: 'collapsing',
        render: function render(data, type, row) {
          if (type === 'display') {
            // Translate mode values
            var modeKey = 'cf_FileActions' + (data || 'None').charAt(0).toUpperCase() + (data || 'none').slice(1);
            return globalTranslate[modeKey] || data || '—';
          }

          return data || '';
        }
      }, {
        data: 'description',
        className: 'hide-on-mobile',
        orderable: false,
        render: function render(data, type, row) {
          if (type === 'display') {
            if (!data) {
              return '—';
            } // If description is long, show it in a popup


            if (data.length > 80) {
              return "<div class=\"ui basic icon button popuped\" data-content=\"".concat(data, "\" data-variation=\"wide\">\n                                            <i class=\"file text icon\"></i>\n                                        </div>");
            }

            return data;
          }

          return data || '';
        }
      }],
      onDrawCallback: function onDrawCallback() {
        // Initialize popups for long descriptions
        this.$table.find('.popuped').popup({
          position: 'top right',
          variation: 'wide',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          }
        });
      }
    }); // Initialize the base class

    this.dataTableInstance.initialize();
  },

  /**
   * Initialize the page length dropdown with Semantic UI
   */
  initializePageLengthDropdown: function initializePageLengthDropdown() {
    // Get saved page length from localStorage
    var savedPageLength = localStorage.getItem('customFilesTablePageLength'); // Set initial value of dropdown

    if (savedPageLength && savedPageLength !== 'auto') {
      customFilesTable.$pageLengthDropdown.dropdown('set selected', savedPageLength);
    } // Initialize Semantic UI dropdown with change handler


    customFilesTable.$pageLengthDropdown.dropdown({
      onChange: function onChange(pageLength) {
        if (pageLength === 'auto') {
          pageLength = customFilesTable.calculatePageLength();
          localStorage.removeItem('customFilesTablePageLength');
        } else {
          localStorage.setItem('customFilesTablePageLength', pageLength);
        } // Update DataTable page length if it's initialized


        if (customFilesTable.dataTableInstance && customFilesTable.dataTableInstance.dataTable) {
          customFilesTable.dataTableInstance.dataTable.page.len(pageLength).draw();
        }
      }
    }); // Prevent dropdown from closing the search input

    customFilesTable.$pageLengthDropdown.on('click', function (event) {
      event.stopPropagation();
    }); // Start the search when clicking on the icon

    $('#search-icon').on('click', function () {
      $('#global-search').focus();
    }); // Handle search input

    $('#global-search').on('keyup change', function () {
      var searchValue = $(this).val(); // Use DataTables built-in search

      if (customFilesTable.dataTableInstance && customFilesTable.dataTableInstance.dataTable) {
        customFilesTable.dataTableInstance.dataTable.search(searchValue).draw();
      }
    });
  },

  /**
   * Calculate optimal page length based on window height
   * @returns {number} The calculated page length
   */
  calculatePageLength: function calculatePageLength() {
    // Get the table element
    var $table = $('#custom-files-table'); // Calculate row height from first row if table exists

    var rowHeight = 50; // Default row height

    var $firstRow = $table.find('tbody tr').first();

    if ($firstRow.length) {
      rowHeight = $firstRow.outerHeight() || 50;
    } // Calculate window height and available space for table


    var windowHeight = window.innerHeight;
    var headerFooterHeight = 400; // Estimate height for header, footer, and other elements
    // Calculate new page length (minimum 10 rows)

    var calculatedLength = Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 10); // Get saved value or return calculated

    var savedPageLength = localStorage.getItem('customFilesTablePageLength');

    if (savedPageLength && savedPageLength !== 'auto') {
      return parseInt(savedPageLength, 10);
    }

    return calculatedLength;
  }
}; // Initialize the custom files table when the document is ready.

$(document).ready(function () {
  customFilesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtaW5kZXguanMiXSwibmFtZXMiOlsiY3VzdG9tRmlsZXNUYWJsZSIsImRhdGFUYWJsZUluc3RhbmNlIiwiJHBhZ2VMZW5ndGhEcm9wZG93biIsIiQiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93biIsIlBieERhdGFUYWJsZUluZGV4IiwidGFibGVJZCIsImFwaU1vZHVsZSIsImN1c3RvbUZpbGVzQVBJIiwiYXBpTWV0aG9kIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwic2hvd0luZm8iLCJhY3Rpb25CdXR0b25zIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlIiwiZGVsZXRlRGlzYWJsZWRUb29sdGlwIiwiY2ZfQ2Fubm90RGVsZXRlU3lzdGVtRmlsZSIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsInJvdyIsIm1vZGUiLCJkYXRhVGFibGVPcHRpb25zIiwicGFnaW5nIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsZW5ndGhNZW51IiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nVHlwZSIsInNlYXJjaGluZyIsImRvbSIsImNvbHVtbnMiLCJkYXRhIiwicmVuZGVyIiwidHlwZSIsImNsYXNzTmFtZSIsIm1vZGVLZXkiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwib3JkZXJhYmxlIiwibGVuZ3RoIiwib25EcmF3Q2FsbGJhY2siLCIkdGFibGUiLCJmaW5kIiwicG9wdXAiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJzYXZlZFBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwiZGF0YVRhYmxlIiwicGFnZSIsImxlbiIsImRyYXciLCJvbiIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwiZm9jdXMiLCJzZWFyY2hWYWx1ZSIsInZhbCIsInNlYXJjaCIsInJvd0hlaWdodCIsIiRmaXJzdFJvdyIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImNhbGN1bGF0ZWRMZW5ndGgiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJwYXJzZUludCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFKRTs7QUFNckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FURDs7QUFXckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZHFCLHdCQWNSO0FBQ1Q7QUFDQUosSUFBQUEsZ0JBQWdCLENBQUNLLDRCQUFqQixHQUZTLENBSVQ7O0FBQ0EsU0FBS0osaUJBQUwsR0FBeUIsSUFBSUssaUJBQUosQ0FBc0I7QUFDM0NDLE1BQUFBLE9BQU8sRUFBRSxvQkFEa0M7QUFFM0NDLE1BQUFBLFNBQVMsRUFBRUMsY0FGZ0M7QUFHM0NDLE1BQUFBLFNBQVMsRUFBRSxZQUhnQztBQUdsQjtBQUN6QkMsTUFBQUEsV0FBVyxFQUFFLGNBSjhCO0FBSzNDQyxNQUFBQSxtQkFBbUIsRUFBRSxLQUxzQjtBQUtmO0FBQzVCQyxNQUFBQSxRQUFRLEVBQUUsSUFOaUM7QUFNM0I7QUFD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QVMsR0FBRzVCLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLFVBQVosRUFBd0I0QixLQUF4QixFQUFsQjs7QUFDQSxRQUFJRCxTQUFTLENBQUM5QixNQUFkLEVBQXNCO0FBQ2xCNkIsTUFBQUEsU0FBUyxHQUFHQyxTQUFTLENBQUNFLFdBQVYsTUFBMkIsRUFBdkM7QUFDSCxLQVRpQixDQVdsQjs7O0FBQ0EsUUFBTUMsWUFBWSxHQUFHQyxNQUFNLENBQUNDLFdBQTVCO0FBQ0EsUUFBTUMsa0JBQWtCLEdBQUcsR0FBM0IsQ0Fia0IsQ0FhYztBQUVoQzs7QUFDQSxRQUFNQyxnQkFBZ0IsR0FBR0MsSUFBSSxDQUFDQyxHQUFMLENBQVNELElBQUksQ0FBQ0UsS0FBTCxDQUFXLENBQUNQLFlBQVksR0FBR0csa0JBQWhCLElBQXNDUCxTQUFqRCxDQUFULEVBQXNFLEVBQXRFLENBQXpCLENBaEJrQixDQWtCbEI7O0FBQ0EsUUFBTWxCLGVBQWUsR0FBR0MsWUFBWSxDQUFDQyxPQUFiLENBQXFCLDRCQUFyQixDQUF4Qjs7QUFDQSxRQUFJRixlQUFlLElBQUlBLGVBQWUsS0FBSyxNQUEzQyxFQUFtRDtBQUMvQyxhQUFPOEIsUUFBUSxDQUFDOUIsZUFBRCxFQUFrQixFQUFsQixDQUFmO0FBQ0g7O0FBRUQsV0FBTzBCLGdCQUFQO0FBQ0g7QUExTG9CLENBQXpCLEMsQ0E2TEE7O0FBQ0E3RSxDQUFDLENBQUNrRixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdEYsRUFBQUEsZ0JBQWdCLENBQUNJLFVBQWpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qXG4gKiBDdXN0b20gRmlsZXMgdGFibGUgbWFuYWdlbWVudCBtb2R1bGUgdXNpbmcgdW5pZmllZCBiYXNlIGNsYXNzXG4gKlxuICogSW1wbGVtZW50cyBEYXRhVGFibGUgd2l0aCBTZW1hbnRpYyBVSSBmb2xsb3dpbmcgZ3VpZGVsaW5lcyxcbiAqIGxvYWRzIGRhdGEgdmlhIFJFU1QgQVBJIHYzLCBhbmQgZm9sbG93cyBNaWtvUEJYIHN0YW5kYXJkcy5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgY3VzdG9tRmlsZXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uLCBQYnhEYXRhVGFibGVJbmRleCAqL1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgaGFuZGxpbmcgaW50ZXJhY3Rpb25zIHdpdGggdGhlIGN1c3RvbSBmaWxlcyB0YWJsZS5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZXNUYWJsZVxuICovXG5jb25zdCBjdXN0b21GaWxlc1RhYmxlID0ge1xuICAgIC8qKlxuICAgICAqIERhdGFUYWJsZSBpbnN0YW5jZSBmcm9tIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBkYXRhVGFibGVJbnN0YW5jZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwYWdlIGxlbmd0aCBkcm9wZG93blxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoRHJvcGRvd246ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b20gZmlsZXMgdGFibGUsIGFwcGx5aW5nIERhdGFUYWJsZSBmZWF0dXJlcyBhbmQgc2V0dGluZyB1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGZvciBwYWdlIGxlbmd0aCBzZWxlY3Rpb25cbiAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5pbml0aWFsaXplUGFnZUxlbmd0aERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlIG9mIGJhc2UgY2xhc3Mgd2l0aCBDdXN0b20gRmlsZXMgc3BlY2lmaWMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlID0gbmV3IFBieERhdGFUYWJsZUluZGV4KHtcbiAgICAgICAgICAgIHRhYmxlSWQ6ICdjdXN0b20tZmlsZXMtdGFibGUnLFxuICAgICAgICAgICAgYXBpTW9kdWxlOiBjdXN0b21GaWxlc0FQSSxcbiAgICAgICAgICAgIGFwaU1ldGhvZDogJ2dldFJlY29yZHMnLCAvLyBVc2UgdGhlIHN0YW5kYXJkIG1ldGhvZCBuYW1lXG4gICAgICAgICAgICByb3V0ZVByZWZpeDogJ2N1c3RvbS1maWxlcycsXG4gICAgICAgICAgICBzaG93U3VjY2Vzc01lc3NhZ2VzOiBmYWxzZSwgLy8gU2lsZW50IG9wZXJhdGlvbiAtIGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkc1xuICAgICAgICAgICAgc2hvd0luZm86IHRydWUsIC8vIFNob3cgRGF0YVRhYmxlIGluZm8gZm9yIHBhZ2luYXRpb25cbiAgICAgICAgICAgIGFjdGlvbkJ1dHRvbnM6IFsnZWRpdCcsICdkZWxldGUnXSwgLy8gRWRpdCBhbmQgZGVsZXRlIGJ1dHRvbnMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgZGVsZXRlRXJyb3I6IGdsb2JhbFRyYW5zbGF0ZS5jZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlLFxuICAgICAgICAgICAgICAgIGRlbGV0ZURpc2FibGVkVG9vbHRpcDogZ2xvYmFsVHJhbnNsYXRlLmNmX0Nhbm5vdERlbGV0ZVN5c3RlbUZpbGUgfHwgJ1N5c3RlbSBmaWxlcyBjYW5ub3QgYmUgZGVsZXRlZCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBDdXN0b20gZGVsZXRlIHBlcm1pc3Npb24gY2hlY2sgLSBvbmx5IGFsbG93IGRlbGV0ZSBmb3IgY3VzdG9tIG1vZGUgZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjazogKHJvdykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgYWxsb3cgZGVsZXRpb24gb2YgZmlsZXMgd2l0aCBtb2RlID09PSAnY3VzdG9tJ1xuICAgICAgICAgICAgICAgIHJldHVybiByb3cubW9kZSA9PT0gJ2N1c3RvbSc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVRhYmxlT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSwgLy8gRW5hYmxlIHBhZ2luYXRpb25cbiAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoOiBjdXN0b21GaWxlc1RhYmxlLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSwgLy8gQ2FsY3VsYXRlIGluaXRpYWwgcGFnZSBsZW5ndGhcbiAgICAgICAgICAgICAgICBsZW5ndGhNZW51OiBbWzI1LCAxMDBdLCBbMjUsIDEwMF1dLCAvLyBQYWdlIHNpemUgb3B0aW9ucyAtIHNpbXBsaWZpZWRcbiAgICAgICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLCAvLyBXZSB1c2UgY3VzdG9tIGRyb3Bkb3duIGluc3RlYWQgb2YgYnVpbHQtaW5cbiAgICAgICAgICAgICAgICBwYWdpbmdUeXBlOiAnc2ltcGxlX251bWJlcnMnLCAvLyBTaG93IHBhZ2UgbnVtYmVyc1xuICAgICAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSwgLy8gRW5hYmxlIHNlYXJjaGluZyBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICAgICAgZG9tOiAncnRpcCcgLy8gUmVtb3ZlIGZpbHRlciAoZikgYW5kIGxlbmd0aCAobCkgZnJvbSBET00sIGtlZXAgb25seSBwcm9jZXNzaW5nIChyKSwgdGFibGUgKHQpLCBpbmZvIChpKSwgcGFnaW5hdGlvbiAocClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vZGUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2xhdGUgbW9kZSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlS2V5ID0gJ2NmX0ZpbGVBY3Rpb25zJyArIChkYXRhIHx8ICdOb25lJykuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyAoZGF0YSB8fCAnbm9uZScpLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGVbbW9kZUtleV0gfHwgZGF0YSB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGRlc2NyaXB0aW9uIGlzIGxvbmcsIHNob3cgaXQgaW4gYSBwb3B1cFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2RhdGF9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uRHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgbG9uZyBkZXNjcmlwdGlvbnNcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCcucG9wdXBlZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd3aWRlJyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYmFzZSBjbGFzc1xuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcGFnZSBsZW5ndGggZHJvcGRvd24gd2l0aCBTZW1hbnRpYyBVSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYWdlTGVuZ3RoRHJvcGRvd24oKSB7XG4gICAgICAgIC8vIEdldCBzYXZlZCBwYWdlIGxlbmd0aCBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcblxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZSBvZiBkcm9wZG93blxuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoICYmIHNhdmVkUGFnZUxlbmd0aCAhPT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIHdpdGggY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS4kcGFnZUxlbmd0aERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjdXN0b21GaWxlc1RhYmxlLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIERhdGFUYWJsZSBwYWdlIGxlbmd0aCBpZiBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UgJiYgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHJldmVudCBkcm9wZG93biBmcm9tIGNsb3NpbmcgdGhlIHNlYXJjaCBpbnB1dFxuICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24ub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4gY2xpY2tpbmcgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKCcjZ2xvYmFsLXNlYXJjaCcpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXRcbiAgICAgICAgJCgnI2dsb2JhbC1zZWFyY2gnKS5vbigna2V5dXAgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQodGhpcykudmFsKCk7XG4gICAgICAgICAgICAvLyBVc2UgRGF0YVRhYmxlcyBidWlsdC1pbiBzZWFyY2hcbiAgICAgICAgICAgIGlmIChjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlICYmIGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UuZGF0YVRhYmxlKSB7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUuc2VhcmNoKHNlYXJjaFZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgb3B0aW1hbCBwYWdlIGxlbmd0aCBiYXNlZCBvbiB3aW5kb3cgaGVpZ2h0XG4gICAgICogQHJldHVybnMge251bWJlcn0gVGhlIGNhbGN1bGF0ZWQgcGFnZSBsZW5ndGhcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHRhYmxlIGVsZW1lbnRcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJCgnI2N1c3RvbS1maWxlcy10YWJsZScpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0IGZyb20gZmlyc3Qgcm93IGlmIHRhYmxlIGV4aXN0c1xuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gNTA7IC8vIERlZmF1bHQgcm93IGhlaWdodFxuICAgICAgICBjb25zdCAkZmlyc3RSb3cgPSAkdGFibGUuZmluZCgndGJvZHkgdHInKS5maXJzdCgpO1xuICAgICAgICBpZiAoJGZpcnN0Um93Lmxlbmd0aCkge1xuICAgICAgICAgICAgcm93SGVpZ2h0ID0gJGZpcnN0Um93Lm91dGVySGVpZ2h0KCkgfHwgNTA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aCAobWluaW11bSAxMCByb3dzKVxuICAgICAgICBjb25zdCBjYWxjdWxhdGVkTGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcblxuICAgICAgICAvLyBHZXQgc2F2ZWQgdmFsdWUgb3IgcmV0dXJuIGNhbGN1bGF0ZWRcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGggJiYgc2F2ZWRQYWdlTGVuZ3RoICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjYWxjdWxhdGVkTGVuZ3RoO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyB0YWJsZSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlc1RhYmxlLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==