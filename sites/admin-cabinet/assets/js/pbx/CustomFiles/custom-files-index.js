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
        deleteDisabledTooltip: globalTranslate.cf_CannotDeleteSystemFile
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtaW5kZXguanMiXSwibmFtZXMiOlsiY3VzdG9tRmlsZXNUYWJsZSIsImRhdGFUYWJsZUluc3RhbmNlIiwiJHBhZ2VMZW5ndGhEcm9wZG93biIsIiQiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93biIsIlBieERhdGFUYWJsZUluZGV4IiwidGFibGVJZCIsImFwaU1vZHVsZSIsImN1c3RvbUZpbGVzQVBJIiwiYXBpTWV0aG9kIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwic2hvd0luZm8iLCJhY3Rpb25CdXR0b25zIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlIiwiZGVsZXRlRGlzYWJsZWRUb29sdGlwIiwiY2ZfQ2Fubm90RGVsZXRlU3lzdGVtRmlsZSIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsInJvdyIsIm1vZGUiLCJkYXRhVGFibGVPcHRpb25zIiwicGFnaW5nIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsZW5ndGhNZW51IiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nVHlwZSIsInNlYXJjaGluZyIsImRvbSIsImNvbHVtbnMiLCJkYXRhIiwicmVuZGVyIiwidHlwZSIsImNsYXNzTmFtZSIsIm1vZGVLZXkiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwib3JkZXJhYmxlIiwibGVuZ3RoIiwib25EcmF3Q2FsbGJhY2siLCIkdGFibGUiLCJmaW5kIiwicG9wdXAiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJzYXZlZFBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwiZGF0YVRhYmxlIiwicGFnZSIsImxlbiIsImRyYXciLCJvbiIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwiZm9jdXMiLCJzZWFyY2hWYWx1ZSIsInZhbCIsInNlYXJjaCIsInJvd0hlaWdodCIsIiRmaXJzdFJvdyIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImNhbGN1bGF0ZWRMZW5ndGgiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJwYXJzZUludCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFKRTs7QUFNckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FURDs7QUFXckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZHFCLHdCQWNSO0FBQ1Q7QUFDQUosSUFBQUEsZ0JBQWdCLENBQUNLLDRCQUFqQixHQUZTLENBSVQ7O0FBQ0EsU0FBS0osaUJBQUwsR0FBeUIsSUFBSUssaUJBQUosQ0FBc0I7QUFDM0NDLE1BQUFBLE9BQU8sRUFBRSxvQkFEa0M7QUFFM0NDLE1BQUFBLFNBQVMsRUFBRUMsY0FGZ0M7QUFHM0NDLE1BQUFBLFNBQVMsRUFBRSxZQUhnQztBQUdsQjtBQUN6QkMsTUFBQUEsV0FBVyxFQUFFLGNBSjhCO0FBSzNDQyxNQUFBQSxtQkFBbUIsRUFBRSxLQUxzQjtBQUtmO0FBQzVCQyxNQUFBQSxRQUFRLEVBQUUsSUFOaUM7QUFNM0I7QUFDaEJDLE1BQUFBLGFBQWEsRUFBRSxDQUFDLE1BQUQsRUFBUyxRQUFULENBUDRCO0FBT1I7QUFDbkNDLE1BQUFBLFlBQVksRUFBRTtBQUNWQyxRQUFBQSxXQUFXLEVBQUVDLGVBQWUsQ0FBQ0MseUJBRG5CO0FBRVZDLFFBQUFBLHFCQUFxQixFQUFFRixlQUFlLENBQUNHO0FBRjdCLE9BUjZCO0FBWTNDO0FBQ0FDLE1BQUFBLDJCQUEyQixFQUFFLHFDQUFDQyxHQUFELEVBQVM7QUFDbEM7QUFDQSxlQUFPQSxHQUFHLENBQUNDLElBQUosS0FBYSxRQUFwQjtBQUNILE9BaEIwQztBQWlCM0NDLE1BQUFBLGdCQUFnQixFQUFFO0FBQ2RDLFFBQUFBLE1BQU0sRUFBRSxJQURNO0FBQ0E7QUFDZEMsUUFBQUEsVUFBVSxFQUFFMUIsZ0JBQWdCLENBQUMyQixtQkFBakIsRUFGRTtBQUVzQztBQUNwREMsUUFBQUEsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFELEVBQUssR0FBTCxDQUFELEVBQVksQ0FBQyxFQUFELEVBQUssR0FBTCxDQUFaLENBSEU7QUFHc0I7QUFDcENDLFFBQUFBLFlBQVksRUFBRSxLQUpBO0FBSU87QUFDckJDLFFBQUFBLFVBQVUsRUFBRSxnQkFMRTtBQUtnQjtBQUM5QkMsUUFBQUEsU0FBUyxFQUFFLElBTkc7QUFNRztBQUNqQkMsUUFBQUEsR0FBRyxFQUFFLE1BUFMsQ0FPRjs7QUFQRSxPQWpCeUI7QUEwQjNDQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsVUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUUsZ0JBQVNELElBQVQsRUFBZUUsSUFBZixFQUFxQmQsR0FBckIsRUFBMEI7QUFDOUIsY0FBSWMsSUFBSSxLQUFLLFNBQWIsRUFBd0I7QUFDcEIsbUJBQU9GLElBQUksSUFBSSxHQUFmO0FBQ0g7O0FBQ0QsaUJBQU9BLElBQUksSUFBSSxFQUFmO0FBQ0g7QUFQTCxPQURLLEVBVUw7QUFDSUEsUUFBQUEsSUFBSSxFQUFFLE1BRFY7QUFFSUcsUUFBQUEsU0FBUyxFQUFFLFlBRmY7QUFHSUYsUUFBQUEsTUFBTSxFQUFFLGdCQUFTRCxJQUFULEVBQWVFLElBQWYsRUFBcUJkLEdBQXJCLEVBQTBCO0FBQzlCLGNBQUljLElBQUksS0FBSyxTQUFiLEVBQXdCO0FBQ3BCO0FBQ0EsZ0JBQU1FLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQ0osSUFBSSxJQUFJLE1BQVQsRUFBaUJLLE1BQWpCLENBQXdCLENBQXhCLEVBQTJCQyxXQUEzQixFQUFuQixHQUE4RCxDQUFDTixJQUFJLElBQUksTUFBVCxFQUFpQk8sS0FBakIsQ0FBdUIsQ0FBdkIsQ0FBOUU7QUFDQSxtQkFBT3hCLGVBQWUsQ0FBQ3FCLE9BQUQsQ0FBZixJQUE0QkosSUFBNUIsSUFBb0MsR0FBM0M7QUFDSDs7QUFDRCxpQkFBT0EsSUFBSSxJQUFJLEVBQWY7QUFDSDtBQVZMLE9BVkssRUFzQkw7QUFDSUEsUUFBQUEsSUFBSSxFQUFFLGFBRFY7QUFFSUcsUUFBQUEsU0FBUyxFQUFFLGdCQUZmO0FBR0lLLFFBQUFBLFNBQVMsRUFBRSxLQUhmO0FBSUlQLFFBQUFBLE1BQU0sRUFBRSxnQkFBU0QsSUFBVCxFQUFlRSxJQUFmLEVBQXFCZCxHQUFyQixFQUEwQjtBQUM5QixjQUFJYyxJQUFJLEtBQUssU0FBYixFQUF3QjtBQUNwQixnQkFBSSxDQUFDRixJQUFMLEVBQVc7QUFDUCxxQkFBTyxHQUFQO0FBQ0gsYUFIbUIsQ0FLcEI7OztBQUNBLGdCQUFJQSxJQUFJLENBQUNTLE1BQUwsR0FBYyxFQUFsQixFQUFzQjtBQUNsQiwwRkFBa0VULElBQWxFO0FBR0g7O0FBRUQsbUJBQU9BLElBQVA7QUFDSDs7QUFDRCxpQkFBT0EsSUFBSSxJQUFJLEVBQWY7QUFDSDtBQXBCTCxPQXRCSyxDQTFCa0M7QUF1RTNDVSxNQUFBQSxjQUFjLEVBQUUsMEJBQVc7QUFDdkI7QUFDQSxhQUFLQyxNQUFMLENBQVlDLElBQVosQ0FBaUIsVUFBakIsRUFBNkJDLEtBQTdCLENBQW1DO0FBQy9CQyxVQUFBQSxRQUFRLEVBQUUsV0FEcUI7QUFFL0JDLFVBQUFBLFNBQVMsRUFBRSxNQUZvQjtBQUcvQkMsVUFBQUEsU0FBUyxFQUFFLElBSG9CO0FBSS9CQyxVQUFBQSxLQUFLLEVBQUU7QUFDSEMsWUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsWUFBQUEsSUFBSSxFQUFFO0FBRkg7QUFKd0IsU0FBbkM7QUFTSDtBQWxGMEMsS0FBdEIsQ0FBekIsQ0FMUyxDQTBGVDs7QUFDQSxTQUFLcEQsaUJBQUwsQ0FBdUJHLFVBQXZCO0FBQ0gsR0ExR29COztBQTRHckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLDRCQS9HcUIsMENBK0dVO0FBQzNCO0FBQ0EsUUFBTWlELGVBQWUsR0FBR0MsWUFBWSxDQUFDQyxPQUFiLENBQXFCLDRCQUFyQixDQUF4QixDQUYyQixDQUkzQjs7QUFDQSxRQUFJRixlQUFlLElBQUlBLGVBQWUsS0FBSyxNQUEzQyxFQUFtRDtBQUMvQ3RELE1BQUFBLGdCQUFnQixDQUFDRSxtQkFBakIsQ0FBcUN1RCxRQUFyQyxDQUE4QyxjQUE5QyxFQUE4REgsZUFBOUQ7QUFDSCxLQVAwQixDQVMzQjs7O0FBQ0F0RCxJQUFBQSxnQkFBZ0IsQ0FBQ0UsbUJBQWpCLENBQXFDdUQsUUFBckMsQ0FBOEM7QUFDMUNDLE1BQUFBLFFBRDBDLG9CQUNqQ2hDLFVBRGlDLEVBQ3JCO0FBQ2pCLFlBQUlBLFVBQVUsS0FBSyxNQUFuQixFQUEyQjtBQUN2QkEsVUFBQUEsVUFBVSxHQUFHMUIsZ0JBQWdCLENBQUMyQixtQkFBakIsRUFBYjtBQUNBNEIsVUFBQUEsWUFBWSxDQUFDSSxVQUFiLENBQXdCLDRCQUF4QjtBQUNILFNBSEQsTUFHTztBQUNISixVQUFBQSxZQUFZLENBQUNLLE9BQWIsQ0FBcUIsNEJBQXJCLEVBQW1EbEMsVUFBbkQ7QUFDSCxTQU5nQixDQVFqQjs7O0FBQ0EsWUFBSTFCLGdCQUFnQixDQUFDQyxpQkFBakIsSUFBc0NELGdCQUFnQixDQUFDQyxpQkFBakIsQ0FBbUM0RCxTQUE3RSxFQUF3RjtBQUNwRjdELFVBQUFBLGdCQUFnQixDQUFDQyxpQkFBakIsQ0FBbUM0RCxTQUFuQyxDQUE2Q0MsSUFBN0MsQ0FBa0RDLEdBQWxELENBQXNEckMsVUFBdEQsRUFBa0VzQyxJQUFsRTtBQUNIO0FBQ0o7QUFieUMsS0FBOUMsRUFWMkIsQ0EwQjNCOztBQUNBaEUsSUFBQUEsZ0JBQWdCLENBQUNFLG1CQUFqQixDQUFxQytELEVBQXJDLENBQXdDLE9BQXhDLEVBQWlELFVBQVNDLEtBQVQsRUFBZ0I7QUFDN0RBLE1BQUFBLEtBQUssQ0FBQ0MsZUFBTjtBQUNILEtBRkQsRUEzQjJCLENBK0IzQjs7QUFDQWhFLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I4RCxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDOUQsTUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JpRSxLQUFwQjtBQUNILEtBRkQsRUFoQzJCLENBb0MzQjs7QUFDQWpFLElBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9COEQsRUFBcEIsQ0FBdUIsY0FBdkIsRUFBdUMsWUFBVztBQUM5QyxVQUFNSSxXQUFXLEdBQUdsRSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFtRSxHQUFSLEVBQXBCLENBRDhDLENBRTlDOztBQUNBLFVBQUl0RSxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLElBQXNDRCxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLENBQW1DNEQsU0FBN0UsRUFBd0Y7QUFDcEY3RCxRQUFBQSxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLENBQW1DNEQsU0FBbkMsQ0FBNkNVLE1BQTdDLENBQW9ERixXQUFwRCxFQUFpRUwsSUFBakU7QUFDSDtBQUNKLEtBTkQ7QUFPSCxHQTNKb0I7O0FBNkpyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJckMsRUFBQUEsbUJBaktxQixpQ0FpS0M7QUFDbEI7QUFDQSxRQUFNa0IsTUFBTSxHQUFHMUMsQ0FBQyxDQUFDLHFCQUFELENBQWhCLENBRmtCLENBSWxCOztBQUNBLFFBQUlxRSxTQUFTLEdBQUcsRUFBaEIsQ0FMa0IsQ0FLRTs7QUFDcEIsUUFBTUMsU0FBUyxHQUFHNUIsTUFBTSxDQUFDQyxJQUFQLENBQVksVUFBWixFQUF3QjRCLEtBQXhCLEVBQWxCOztBQUNBLFFBQUlELFNBQVMsQ0FBQzlCLE1BQWQsRUFBc0I7QUFDbEI2QixNQUFBQSxTQUFTLEdBQUdDLFNBQVMsQ0FBQ0UsV0FBVixNQUEyQixFQUF2QztBQUNILEtBVGlCLENBV2xCOzs7QUFDQSxRQUFNQyxZQUFZLEdBQUdDLE1BQU0sQ0FBQ0MsV0FBNUI7QUFDQSxRQUFNQyxrQkFBa0IsR0FBRyxHQUEzQixDQWJrQixDQWFjO0FBRWhDOztBQUNBLFFBQU1DLGdCQUFnQixHQUFHQyxJQUFJLENBQUNDLEdBQUwsQ0FBU0QsSUFBSSxDQUFDRSxLQUFMLENBQVcsQ0FBQ1AsWUFBWSxHQUFHRyxrQkFBaEIsSUFBc0NQLFNBQWpELENBQVQsRUFBc0UsRUFBdEUsQ0FBekIsQ0FoQmtCLENBa0JsQjs7QUFDQSxRQUFNbEIsZUFBZSxHQUFHQyxZQUFZLENBQUNDLE9BQWIsQ0FBcUIsNEJBQXJCLENBQXhCOztBQUNBLFFBQUlGLGVBQWUsSUFBSUEsZUFBZSxLQUFLLE1BQTNDLEVBQW1EO0FBQy9DLGFBQU84QixRQUFRLENBQUM5QixlQUFELEVBQWtCLEVBQWxCLENBQWY7QUFDSDs7QUFFRCxXQUFPMEIsZ0JBQVA7QUFDSDtBQTFMb0IsQ0FBekIsQyxDQTZMQTs7QUFDQTdFLENBQUMsQ0FBQ2tGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ0RixFQUFBQSxnQkFBZ0IsQ0FBQ0ksVUFBakI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLypcbiAqIEN1c3RvbSBGaWxlcyB0YWJsZSBtYW5hZ2VtZW50IG1vZHVsZSB1c2luZyB1bmlmaWVkIGJhc2UgY2xhc3NcbiAqXG4gKiBJbXBsZW1lbnRzIERhdGFUYWJsZSB3aXRoIFNlbWFudGljIFVJIGZvbGxvd2luZyBndWlkZWxpbmVzLFxuICogbG9hZHMgZGF0YSB2aWEgUkVTVCBBUEkgdjMsIGFuZCBmb2xsb3dzIE1pa29QQlggc3RhbmRhcmRzLlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBjdXN0b21GaWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieERhdGFUYWJsZUluZGV4ICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBoYW5kbGluZyBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgY3VzdG9tIGZpbGVzIHRhYmxlLlxuICogQG1vZHVsZSBjdXN0b21GaWxlc1RhYmxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGVzVGFibGUgPSB7XG4gICAgLyoqXG4gICAgICogRGF0YVRhYmxlIGluc3RhbmNlIGZyb20gYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGRhdGFUYWJsZUluc3RhbmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHBhZ2UgbGVuZ3RoIGRyb3Bkb3duXG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhEcm9wZG93bjogJCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbSBmaWxlcyB0YWJsZSwgYXBwbHlpbmcgRGF0YVRhYmxlIGZlYXR1cmVzIGFuZCBzZXR0aW5nIHVwIGV2ZW50IGhhbmRsZXJzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gZm9yIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvblxuICAgICAgICBjdXN0b21GaWxlc1RhYmxlLmluaXRpYWxpemVQYWdlTGVuZ3RoRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2Ugb2YgYmFzZSBjbGFzcyB3aXRoIEN1c3RvbSBGaWxlcyBzcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UgPSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXgoe1xuICAgICAgICAgICAgdGFibGVJZDogJ2N1c3RvbS1maWxlcy10YWJsZScsXG4gICAgICAgICAgICBhcGlNb2R1bGU6IGN1c3RvbUZpbGVzQVBJLFxuICAgICAgICAgICAgYXBpTWV0aG9kOiAnZ2V0UmVjb3JkcycsIC8vIFVzZSB0aGUgc3RhbmRhcmQgbWV0aG9kIG5hbWVcbiAgICAgICAgICAgIHJvdXRlUHJlZml4OiAnY3VzdG9tLWZpbGVzJyxcbiAgICAgICAgICAgIHNob3dTdWNjZXNzTWVzc2FnZXM6IGZhbHNlLCAvLyBTaWxlbnQgb3BlcmF0aW9uIC0gZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzXG4gICAgICAgICAgICBzaG93SW5mbzogdHJ1ZSwgLy8gU2hvdyBEYXRhVGFibGUgaW5mbyBmb3IgcGFnaW5hdGlvblxuICAgICAgICAgICAgYWN0aW9uQnV0dG9uczogWydlZGl0JywgJ2RlbGV0ZSddLCAvLyBFZGl0IGFuZCBkZWxldGUgYnV0dG9ucyBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICB0cmFuc2xhdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBkZWxldGVFcnJvcjogZ2xvYmFsVHJhbnNsYXRlLmNmX0ltcG9zc2libGVUb0RlbGV0ZUZpbGUsXG4gICAgICAgICAgICAgICAgZGVsZXRlRGlzYWJsZWRUb29sdGlwOiBnbG9iYWxUcmFuc2xhdGUuY2ZfQ2Fubm90RGVsZXRlU3lzdGVtRmlsZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIEN1c3RvbSBkZWxldGUgcGVybWlzc2lvbiBjaGVjayAtIG9ubHkgYWxsb3cgZGVsZXRlIGZvciBjdXN0b20gbW9kZSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRGVsZXRlUGVybWlzc2lvbkNoZWNrOiAocm93KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBhbGxvdyBkZWxldGlvbiBvZiBmaWxlcyB3aXRoIG1vZGUgPT09ICdjdXN0b20nXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tb2RlID09PSAnY3VzdG9tJztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhVGFibGVPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgcGFnaW5nOiB0cnVlLCAvLyBFbmFibGUgcGFnaW5hdGlvblxuICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGN1c3RvbUZpbGVzVGFibGUuY2FsY3VsYXRlUGFnZUxlbmd0aCgpLCAvLyBDYWxjdWxhdGUgaW5pdGlhbCBwYWdlIGxlbmd0aFxuICAgICAgICAgICAgICAgIGxlbmd0aE1lbnU6IFtbMjUsIDEwMF0sIFsyNSwgMTAwXV0sIC8vIFBhZ2Ugc2l6ZSBvcHRpb25zIC0gc2ltcGxpZmllZFxuICAgICAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsIC8vIFdlIHVzZSBjdXN0b20gZHJvcGRvd24gaW5zdGVhZCBvZiBidWlsdC1pblxuICAgICAgICAgICAgICAgIHBhZ2luZ1R5cGU6ICdzaW1wbGVfbnVtYmVycycsIC8vIFNob3cgcGFnZSBudW1iZXJzXG4gICAgICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLCAvLyBFbmFibGUgc2VhcmNoaW5nIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgICAgICAgICBkb206ICdydGlwJyAvLyBSZW1vdmUgZmlsdGVyIChmKSBhbmQgbGVuZ3RoIChsKSBmcm9tIERPTSwga2VlcCBvbmx5IHByb2Nlc3NpbmcgKHIpLCB0YWJsZSAodCksIGluZm8gKGkpLCBwYWdpbmF0aW9uIChwKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdmaWxlcGF0aCcsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEgfHwgJ+KAlCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnbW9kZScsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zbGF0ZSBtb2RlIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGVLZXkgPSAnY2ZfRmlsZUFjdGlvbnMnICsgKGRhdGEgfHwgJ05vbmUnKS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIChkYXRhIHx8ICdub25lJykuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZVttb2RlS2V5XSB8fCBkYXRhIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZGVzY3JpcHRpb24gaXMgbG9uZywgc2hvdyBpdCBpbiBhIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gcG9wdXBlZFwiIGRhdGEtY29udGVudD1cIiR7ZGF0YX1cIiBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJmaWxlIHRleHQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25EcmF3Q2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBsb25nIGRlc2NyaXB0aW9uc1xuICAgICAgICAgICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3dpZGUnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBiYXNlIGNsYXNzXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwYWdlIGxlbmd0aCBkcm9wZG93biB3aXRoIFNlbWFudGljIFVJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93bigpIHtcbiAgICAgICAgLy8gR2V0IHNhdmVkIHBhZ2UgbGVuZ3RoIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjdXN0b21GaWxlc1RhYmxlUGFnZUxlbmd0aCcpO1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlIG9mIGRyb3Bkb3duXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGggJiYgc2F2ZWRQYWdlTGVuZ3RoICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzVGFibGUuJHBhZ2VMZW5ndGhEcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjaGFuZ2UgaGFuZGxlclxuICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGN1c3RvbUZpbGVzVGFibGUuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgRGF0YVRhYmxlIHBhZ2UgbGVuZ3RoIGlmIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZSAmJiBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGRyb3Bkb3duIGZyb20gY2xvc2luZyB0aGUgc2VhcmNoIGlucHV0XG4gICAgICAgIGN1c3RvbUZpbGVzVGFibGUuJHBhZ2VMZW5ndGhEcm9wZG93bi5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiBjbGlja2luZyBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoJyNnbG9iYWwtc2VhcmNoJykuZm9jdXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlYXJjaCBpbnB1dFxuICAgICAgICAkKCcjZ2xvYmFsLXNlYXJjaCcpLm9uKCdrZXl1cCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gJCh0aGlzKS52YWwoKTtcbiAgICAgICAgICAgIC8vIFVzZSBEYXRhVGFibGVzIGJ1aWx0LWluIHNlYXJjaFxuICAgICAgICAgICAgaWYgKGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UgJiYgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUpIHtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZS5zZWFyY2goc2VhcmNoVmFsdWUpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBvcHRpbWFsIHBhZ2UgbGVuZ3RoIGJhc2VkIG9uIHdpbmRvdyBoZWlnaHRcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgY2FsY3VsYXRlZCBwYWdlIGxlbmd0aFxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdGFibGUgZWxlbWVudFxuICAgICAgICBjb25zdCAkdGFibGUgPSAkKCcjY3VzdG9tLWZpbGVzLXRhYmxlJyk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHQgZnJvbSBmaXJzdCByb3cgaWYgdGFibGUgZXhpc3RzXG4gICAgICAgIGxldCByb3dIZWlnaHQgPSA1MDsgLy8gRGVmYXVsdCByb3cgaGVpZ2h0XG4gICAgICAgIGNvbnN0ICRmaXJzdFJvdyA9ICR0YWJsZS5maW5kKCd0Ym9keSB0cicpLmZpcnN0KCk7XG4gICAgICAgIGlmICgkZmlyc3RSb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICByb3dIZWlnaHQgPSAkZmlyc3RSb3cub3V0ZXJIZWlnaHQoKSB8fCA1MDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoIChtaW5pbXVtIDEwIHJvd3MpXG4gICAgICAgIGNvbnN0IGNhbGN1bGF0ZWRMZW5ndGggPSBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgMTApO1xuXG4gICAgICAgIC8vIEdldCBzYXZlZCB2YWx1ZSBvciByZXR1cm4gY2FsY3VsYXRlZFxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCAmJiBzYXZlZFBhZ2VMZW5ndGggIT09ICdhdXRvJykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGN1bGF0ZWRMZW5ndGg7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIHRhYmxlIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19