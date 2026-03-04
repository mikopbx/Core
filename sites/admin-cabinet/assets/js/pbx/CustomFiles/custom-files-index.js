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
   * Calculate optimal page length based on window height.
   * Uses a conservative estimate since the table container is hidden at init time.
   * Subtracts one extra row to guarantee pagination fits without scrolling.
   * @returns {number} The calculated page length
   */
  calculatePageLength: function calculatePageLength() {
    // User preference takes priority
    var savedPageLength = localStorage.getItem('customFilesTablePageLength');

    if (savedPageLength && savedPageLength !== 'auto') {
      return parseInt(savedPageLength, 10);
    }

    var windowHeight = window.innerHeight;
    var rowHeight = 38; // Very compact table row height including borders and sub-pixel gaps
    // 450 accounts for: top menu, page header, controls row, thead, pagination, info, version footer
    // On large screens (>1080) margins/paddings scale up, so we add proportional overhead

    var overhead = 450 + Math.max(0, windowHeight - 1080) * 0.15;
    return Math.max(Math.floor((windowHeight - overhead) / rowHeight), 8);
  }
}; // Initialize the custom files table when the document is ready.

$(document).ready(function () {
  customFilesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtaW5kZXguanMiXSwibmFtZXMiOlsiY3VzdG9tRmlsZXNUYWJsZSIsImRhdGFUYWJsZUluc3RhbmNlIiwiJHBhZ2VMZW5ndGhEcm9wZG93biIsIiQiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93biIsIlBieERhdGFUYWJsZUluZGV4IiwidGFibGVJZCIsImFwaU1vZHVsZSIsImN1c3RvbUZpbGVzQVBJIiwiYXBpTWV0aG9kIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwic2hvd0luZm8iLCJhY3Rpb25CdXR0b25zIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlIiwiZGVsZXRlRGlzYWJsZWRUb29sdGlwIiwiY2ZfQ2Fubm90RGVsZXRlU3lzdGVtRmlsZSIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsInJvdyIsIm1vZGUiLCJkYXRhVGFibGVPcHRpb25zIiwicGFnaW5nIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsZW5ndGhNZW51IiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nVHlwZSIsInNlYXJjaGluZyIsImRvbSIsImNvbHVtbnMiLCJkYXRhIiwicmVuZGVyIiwidHlwZSIsImNsYXNzTmFtZSIsIm1vZGVLZXkiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwib3JkZXJhYmxlIiwibGVuZ3RoIiwib25EcmF3Q2FsbGJhY2siLCIkdGFibGUiLCJmaW5kIiwicG9wdXAiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJzYXZlZFBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwiZGF0YVRhYmxlIiwicGFnZSIsImxlbiIsImRyYXciLCJvbiIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwiZm9jdXMiLCJzZWFyY2hWYWx1ZSIsInZhbCIsInNlYXJjaCIsInBhcnNlSW50Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJyb3dIZWlnaHQiLCJvdmVyaGVhZCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFKRTs7QUFNckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FURDs7QUFXckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZHFCLHdCQWNSO0FBQ1Q7QUFDQUosSUFBQUEsZ0JBQWdCLENBQUNLLDRCQUFqQixHQUZTLENBSVQ7O0FBQ0EsU0FBS0osaUJBQUwsR0FBeUIsSUFBSUssaUJBQUosQ0FBc0I7QUFDM0NDLE1BQUFBLE9BQU8sRUFBRSxvQkFEa0M7QUFFM0NDLE1BQUFBLFNBQVMsRUFBRUMsY0FGZ0M7QUFHM0NDLE1BQUFBLFNBQVMsRUFBRSxZQUhnQztBQUdsQjtBQUN6QkMsTUFBQUEsV0FBVyxFQUFFLGNBSjhCO0FBSzNDQyxNQUFBQSxtQkFBbUIsRUFBRSxLQUxzQjtBQUtmO0FBQzVCQyxNQUFBQSxRQUFRLEVBQUUsSUFOaUM7QUFNM0I7QUFDaEJDLE1BQUFBLGFBQWEsRUFBRSxDQUFDLE1BQUQsRUFBUyxRQUFULENBUDRCO0FBT1I7QUFDbkNDLE1BQUFBLFlBQVksRUFBRTtBQUNWQyxRQUFBQSxXQUFXLEVBQUVDLGVBQWUsQ0FBQ0MseUJBRG5CO0FBRVZDLFFBQUFBLHFCQUFxQixFQUFFRixlQUFlLENBQUNHO0FBRjdCLE9BUjZCO0FBWTNDO0FBQ0FDLE1BQUFBLDJCQUEyQixFQUFFLHFDQUFDQyxHQUFELEVBQVM7QUFDbEM7QUFDQSxlQUFPQSxHQUFHLENBQUNDLElBQUosS0FBYSxRQUFwQjtBQUNILE9BaEIwQztBQWlCM0NDLE1BQUFBLGdCQUFnQixFQUFFO0FBQ2RDLFFBQUFBLE1BQU0sRUFBRSxJQURNO0FBQ0E7QUFDZEMsUUFBQUEsVUFBVSxFQUFFMUIsZ0JBQWdCLENBQUMyQixtQkFBakIsRUFGRTtBQUVzQztBQUNwREMsUUFBQUEsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFELEVBQUssR0FBTCxDQUFELEVBQVksQ0FBQyxFQUFELEVBQUssR0FBTCxDQUFaLENBSEU7QUFHc0I7QUFDcENDLFFBQUFBLFlBQVksRUFBRSxLQUpBO0FBSU87QUFDckJDLFFBQUFBLFVBQVUsRUFBRSxnQkFMRTtBQUtnQjtBQUM5QkMsUUFBQUEsU0FBUyxFQUFFLElBTkc7QUFNRztBQUNqQkMsUUFBQUEsR0FBRyxFQUFFLE1BUFMsQ0FPRjs7QUFQRSxPQWpCeUI7QUEwQjNDQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsVUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUUsZ0JBQVNELElBQVQsRUFBZUUsSUFBZixFQUFxQmQsR0FBckIsRUFBMEI7QUFDOUIsY0FBSWMsSUFBSSxLQUFLLFNBQWIsRUFBd0I7QUFDcEIsbUJBQU9GLElBQUksSUFBSSxHQUFmO0FBQ0g7O0FBQ0QsaUJBQU9BLElBQUksSUFBSSxFQUFmO0FBQ0g7QUFQTCxPQURLLEVBVUw7QUFDSUEsUUFBQUEsSUFBSSxFQUFFLE1BRFY7QUFFSUcsUUFBQUEsU0FBUyxFQUFFLFlBRmY7QUFHSUYsUUFBQUEsTUFBTSxFQUFFLGdCQUFTRCxJQUFULEVBQWVFLElBQWYsRUFBcUJkLEdBQXJCLEVBQTBCO0FBQzlCLGNBQUljLElBQUksS0FBSyxTQUFiLEVBQXdCO0FBQ3BCO0FBQ0EsZ0JBQU1FLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQ0osSUFBSSxJQUFJLE1BQVQsRUFBaUJLLE1BQWpCLENBQXdCLENBQXhCLEVBQTJCQyxXQUEzQixFQUFuQixHQUE4RCxDQUFDTixJQUFJLElBQUksTUFBVCxFQUFpQk8sS0FBakIsQ0FBdUIsQ0FBdkIsQ0FBOUU7QUFDQSxtQkFBT3hCLGVBQWUsQ0FBQ3FCLE9BQUQsQ0FBZixJQUE0QkosSUFBNUIsSUFBb0MsR0FBM0M7QUFDSDs7QUFDRCxpQkFBT0EsSUFBSSxJQUFJLEVBQWY7QUFDSDtBQVZMLE9BVkssRUFzQkw7QUFDSUEsUUFBQUEsSUFBSSxFQUFFLGFBRFY7QUFFSUcsUUFBQUEsU0FBUyxFQUFFLGdCQUZmO0FBR0lLLFFBQUFBLFNBQVMsRUFBRSxLQUhmO0FBSUlQLFFBQUFBLE1BQU0sRUFBRSxnQkFBU0QsSUFBVCxFQUFlRSxJQUFmLEVBQXFCZCxHQUFyQixFQUEwQjtBQUM5QixjQUFJYyxJQUFJLEtBQUssU0FBYixFQUF3QjtBQUNwQixnQkFBSSxDQUFDRixJQUFMLEVBQVc7QUFDUCxxQkFBTyxHQUFQO0FBQ0gsYUFIbUIsQ0FLcEI7OztBQUNBLGdCQUFJQSxJQUFJLENBQUNTLE1BQUwsR0FBYyxFQUFsQixFQUFzQjtBQUNsQiwwRkFBa0VULElBQWxFO0FBR0g7O0FBRUQsbUJBQU9BLElBQVA7QUFDSDs7QUFDRCxpQkFBT0EsSUFBSSxJQUFJLEVBQWY7QUFDSDtBQXBCTCxPQXRCSyxDQTFCa0M7QUF1RTNDVSxNQUFBQSxjQUFjLEVBQUUsMEJBQVc7QUFDdkI7QUFDQSxhQUFLQyxNQUFMLENBQVlDLElBQVosQ0FBaUIsVUFBakIsRUFBNkJDLEtBQTdCLENBQW1DO0FBQy9CQyxVQUFBQSxRQUFRLEVBQUUsV0FEcUI7QUFFL0JDLFVBQUFBLFNBQVMsRUFBRSxNQUZvQjtBQUcvQkMsVUFBQUEsU0FBUyxFQUFFLElBSG9CO0FBSS9CQyxVQUFBQSxLQUFLLEVBQUU7QUFDSEMsWUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsWUFBQUEsSUFBSSxFQUFFO0FBRkg7QUFKd0IsU0FBbkM7QUFVSDtBQW5GMEMsS0FBdEIsQ0FBekIsQ0FMUyxDQTJGVDs7QUFDQSxTQUFLcEQsaUJBQUwsQ0FBdUJHLFVBQXZCO0FBQ0gsR0EzR29COztBQTZHckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLDRCQWhIcUIsMENBZ0hVO0FBQzNCO0FBQ0EsUUFBTWlELGVBQWUsR0FBR0MsWUFBWSxDQUFDQyxPQUFiLENBQXFCLDRCQUFyQixDQUF4QixDQUYyQixDQUkzQjs7QUFDQSxRQUFJRixlQUFlLElBQUlBLGVBQWUsS0FBSyxNQUEzQyxFQUFtRDtBQUMvQ3RELE1BQUFBLGdCQUFnQixDQUFDRSxtQkFBakIsQ0FBcUN1RCxRQUFyQyxDQUE4QyxjQUE5QyxFQUE4REgsZUFBOUQ7QUFDSCxLQVAwQixDQVMzQjs7O0FBQ0F0RCxJQUFBQSxnQkFBZ0IsQ0FBQ0UsbUJBQWpCLENBQXFDdUQsUUFBckMsQ0FBOEM7QUFDMUNDLE1BQUFBLFFBRDBDLG9CQUNqQ2hDLFVBRGlDLEVBQ3JCO0FBQ2pCLFlBQUlBLFVBQVUsS0FBSyxNQUFuQixFQUEyQjtBQUN2QkEsVUFBQUEsVUFBVSxHQUFHMUIsZ0JBQWdCLENBQUMyQixtQkFBakIsRUFBYjtBQUNBNEIsVUFBQUEsWUFBWSxDQUFDSSxVQUFiLENBQXdCLDRCQUF4QjtBQUNILFNBSEQsTUFHTztBQUNISixVQUFBQSxZQUFZLENBQUNLLE9BQWIsQ0FBcUIsNEJBQXJCLEVBQW1EbEMsVUFBbkQ7QUFDSCxTQU5nQixDQVFqQjs7O0FBQ0EsWUFBSTFCLGdCQUFnQixDQUFDQyxpQkFBakIsSUFBc0NELGdCQUFnQixDQUFDQyxpQkFBakIsQ0FBbUM0RCxTQUE3RSxFQUF3RjtBQUNwRjdELFVBQUFBLGdCQUFnQixDQUFDQyxpQkFBakIsQ0FBbUM0RCxTQUFuQyxDQUE2Q0MsSUFBN0MsQ0FBa0RDLEdBQWxELENBQXNEckMsVUFBdEQsRUFBa0VzQyxJQUFsRTtBQUNIO0FBQ0o7QUFieUMsS0FBOUMsRUFWMkIsQ0EwQjNCOztBQUNBaEUsSUFBQUEsZ0JBQWdCLENBQUNFLG1CQUFqQixDQUFxQytELEVBQXJDLENBQXdDLE9BQXhDLEVBQWlELFVBQVNDLEtBQVQsRUFBZ0I7QUFDN0RBLE1BQUFBLEtBQUssQ0FBQ0MsZUFBTjtBQUNILEtBRkQsRUEzQjJCLENBK0IzQjs7QUFDQWhFLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I4RCxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDOUQsTUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JpRSxLQUFwQjtBQUNILEtBRkQsRUFoQzJCLENBb0MzQjs7QUFDQWpFLElBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9COEQsRUFBcEIsQ0FBdUIsY0FBdkIsRUFBdUMsWUFBVztBQUM5QyxVQUFNSSxXQUFXLEdBQUdsRSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFtRSxHQUFSLEVBQXBCLENBRDhDLENBRTlDOztBQUNBLFVBQUl0RSxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLElBQXNDRCxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLENBQW1DNEQsU0FBN0UsRUFBd0Y7QUFDcEY3RCxRQUFBQSxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLENBQW1DNEQsU0FBbkMsQ0FBNkNVLE1BQTdDLENBQW9ERixXQUFwRCxFQUFpRUwsSUFBakU7QUFDSDtBQUNKLEtBTkQ7QUFPSCxHQTVKb0I7O0FBOEpyQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXJDLEVBQUFBLG1CQXBLcUIsaUNBb0tDO0FBQ2xCO0FBQ0EsUUFBTTJCLGVBQWUsR0FBR0MsWUFBWSxDQUFDQyxPQUFiLENBQXFCLDRCQUFyQixDQUF4Qjs7QUFDQSxRQUFJRixlQUFlLElBQUlBLGVBQWUsS0FBSyxNQUEzQyxFQUFtRDtBQUMvQyxhQUFPa0IsUUFBUSxDQUFDbEIsZUFBRCxFQUFrQixFQUFsQixDQUFmO0FBQ0g7O0FBRUQsUUFBTW1CLFlBQVksR0FBR0MsTUFBTSxDQUFDQyxXQUE1QjtBQUNBLFFBQU1DLFNBQVMsR0FBRyxFQUFsQixDQVJrQixDQVFJO0FBRXRCO0FBQ0E7O0FBQ0EsUUFBTUMsUUFBUSxHQUFHLE1BQU1DLElBQUksQ0FBQ0MsR0FBTCxDQUFTLENBQVQsRUFBWU4sWUFBWSxHQUFHLElBQTNCLElBQW1DLElBQTFEO0FBRUEsV0FBT0ssSUFBSSxDQUFDQyxHQUFMLENBQVNELElBQUksQ0FBQ0UsS0FBTCxDQUFXLENBQUNQLFlBQVksR0FBR0ksUUFBaEIsSUFBNEJELFNBQXZDLENBQVQsRUFBNEQsQ0FBNUQsQ0FBUDtBQUNIO0FBbkxvQixDQUF6QixDLENBc0xBOztBQUNBekUsQ0FBQyxDQUFDOEUsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxGLEVBQUFBLGdCQUFnQixDQUFDSSxVQUFqQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKlxuICogQ3VzdG9tIEZpbGVzIHRhYmxlIG1hbmFnZW1lbnQgbW9kdWxlIHVzaW5nIHVuaWZpZWQgYmFzZSBjbGFzc1xuICpcbiAqIEltcGxlbWVudHMgRGF0YVRhYmxlIHdpdGggU2VtYW50aWMgVUkgZm9sbG93aW5nIGd1aWRlbGluZXMsXG4gKiBsb2FkcyBkYXRhIHZpYSBSRVNUIEFQSSB2MywgYW5kIGZvbGxvd3MgTWlrb1BCWCBzdGFuZGFyZHMuXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGN1c3RvbUZpbGVzQVBJLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgUGJ4RGF0YVRhYmxlSW5kZXggKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIGhhbmRsaW5nIGludGVyYWN0aW9ucyB3aXRoIHRoZSBjdXN0b20gZmlsZXMgdGFibGUuXG4gKiBAbW9kdWxlIGN1c3RvbUZpbGVzVGFibGVcbiAqL1xuY29uc3QgY3VzdG9tRmlsZXNUYWJsZSA9IHtcbiAgICAvKipcbiAgICAgKiBEYXRhVGFibGUgaW5zdGFuY2UgZnJvbSBiYXNlIGNsYXNzXG4gICAgICovXG4gICAgZGF0YVRhYmxlSW5zdGFuY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcGFnZSBsZW5ndGggZHJvcGRvd25cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aERyb3Bkb3duOiAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY3VzdG9tIGZpbGVzIHRhYmxlLCBhcHBseWluZyBEYXRhVGFibGUgZmVhdHVyZXMgYW5kIHNldHRpbmcgdXAgZXZlbnQgaGFuZGxlcnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBmb3IgcGFnZSBsZW5ndGggc2VsZWN0aW9uXG4gICAgICAgIGN1c3RvbUZpbGVzVGFibGUuaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93bigpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZSBvZiBiYXNlIGNsYXNzIHdpdGggQ3VzdG9tIEZpbGVzIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5kYXRhVGFibGVJbnN0YW5jZSA9IG5ldyBQYnhEYXRhVGFibGVJbmRleCh7XG4gICAgICAgICAgICB0YWJsZUlkOiAnY3VzdG9tLWZpbGVzLXRhYmxlJyxcbiAgICAgICAgICAgIGFwaU1vZHVsZTogY3VzdG9tRmlsZXNBUEksXG4gICAgICAgICAgICBhcGlNZXRob2Q6ICdnZXRSZWNvcmRzJywgLy8gVXNlIHRoZSBzdGFuZGFyZCBtZXRob2QgbmFtZVxuICAgICAgICAgICAgcm91dGVQcmVmaXg6ICdjdXN0b20tZmlsZXMnLFxuICAgICAgICAgICAgc2hvd1N1Y2Nlc3NNZXNzYWdlczogZmFsc2UsIC8vIFNpbGVudCBvcGVyYXRpb24gLSBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHNcbiAgICAgICAgICAgIHNob3dJbmZvOiB0cnVlLCAvLyBTaG93IERhdGFUYWJsZSBpbmZvIGZvciBwYWdpbmF0aW9uXG4gICAgICAgICAgICBhY3Rpb25CdXR0b25zOiBbJ2VkaXQnLCAnZGVsZXRlJ10sIC8vIEVkaXQgYW5kIGRlbGV0ZSBidXR0b25zIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uczoge1xuICAgICAgICAgICAgICAgIGRlbGV0ZUVycm9yOiBnbG9iYWxUcmFuc2xhdGUuY2ZfSW1wb3NzaWJsZVRvRGVsZXRlRmlsZSxcbiAgICAgICAgICAgICAgICBkZWxldGVEaXNhYmxlZFRvb2x0aXA6IGdsb2JhbFRyYW5zbGF0ZS5jZl9DYW5ub3REZWxldGVTeXN0ZW1GaWxlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gQ3VzdG9tIGRlbGV0ZSBwZXJtaXNzaW9uIGNoZWNrIC0gb25seSBhbGxvdyBkZWxldGUgZm9yIGN1c3RvbSBtb2RlIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21EZWxldGVQZXJtaXNzaW9uQ2hlY2s6IChyb3cpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGFsbG93IGRlbGV0aW9uIG9mIGZpbGVzIHdpdGggbW9kZSA9PT0gJ2N1c3RvbSdcbiAgICAgICAgICAgICAgICByZXR1cm4gcm93Lm1vZGUgPT09ICdjdXN0b20nO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGFUYWJsZU9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBwYWdpbmc6IHRydWUsIC8vIEVuYWJsZSBwYWdpbmF0aW9uXG4gICAgICAgICAgICAgICAgcGFnZUxlbmd0aDogY3VzdG9tRmlsZXNUYWJsZS5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksIC8vIENhbGN1bGF0ZSBpbml0aWFsIHBhZ2UgbGVuZ3RoXG4gICAgICAgICAgICAgICAgbGVuZ3RoTWVudTogW1syNSwgMTAwXSwgWzI1LCAxMDBdXSwgLy8gUGFnZSBzaXplIG9wdGlvbnMgLSBzaW1wbGlmaWVkXG4gICAgICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSwgLy8gV2UgdXNlIGN1c3RvbSBkcm9wZG93biBpbnN0ZWFkIG9mIGJ1aWx0LWluXG4gICAgICAgICAgICAgICAgcGFnaW5nVHlwZTogJ3NpbXBsZV9udW1iZXJzJywgLy8gU2hvdyBwYWdlIG51bWJlcnNcbiAgICAgICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsIC8vIEVuYWJsZSBzZWFyY2hpbmcgZnVuY3Rpb25hbGl0eVxuICAgICAgICAgICAgICAgIGRvbTogJ3J0aXAnIC8vIFJlbW92ZSBmaWx0ZXIgKGYpIGFuZCBsZW5ndGggKGwpIGZyb20gRE9NLCBrZWVwIG9ubHkgcHJvY2Vzc2luZyAociksIHRhYmxlICh0KSwgaW5mbyAoaSksIHBhZ2luYXRpb24gKHApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2ZpbGVwYXRoJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdtb2RlJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNsYXRlIG1vZGUgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZUtleSA9ICdjZl9GaWxlQWN0aW9ucycgKyAoZGF0YSB8fCAnTm9uZScpLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgKGRhdGEgfHwgJ25vbmUnKS5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlW21vZGVLZXldIHx8IGRhdGEgfHwgJ+KAlCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdoaWRlLW9uLW1vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBkZXNjcmlwdGlvbiBpcyBsb25nLCBzaG93IGl0IGluIGEgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtkYXRhfVwiIGRhdGEtdmFyaWF0aW9uPVwid2lkZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZpbGUgdGV4dCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvbkRyYXdDYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGxvbmcgZGVzY3JpcHRpb25zXG4gICAgICAgICAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnd2lkZScsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYmFzZSBjbGFzc1xuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcGFnZSBsZW5ndGggZHJvcGRvd24gd2l0aCBTZW1hbnRpYyBVSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYWdlTGVuZ3RoRHJvcGRvd24oKSB7XG4gICAgICAgIC8vIEdldCBzYXZlZCBwYWdlIGxlbmd0aCBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcblxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZSBvZiBkcm9wZG93blxuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoICYmIHNhdmVkUGFnZUxlbmd0aCAhPT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIHdpdGggY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS4kcGFnZUxlbmd0aERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aCA9PT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBjdXN0b21GaWxlc1RhYmxlLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIERhdGFUYWJsZSBwYWdlIGxlbmd0aCBpZiBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UgJiYgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHJldmVudCBkcm9wZG93biBmcm9tIGNsb3NpbmcgdGhlIHNlYXJjaCBpbnB1dFxuICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24ub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4gY2xpY2tpbmcgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKCcjZ2xvYmFsLXNlYXJjaCcpLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXRcbiAgICAgICAgJCgnI2dsb2JhbC1zZWFyY2gnKS5vbigna2V5dXAgY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQodGhpcykudmFsKCk7XG4gICAgICAgICAgICAvLyBVc2UgRGF0YVRhYmxlcyBidWlsdC1pbiBzZWFyY2hcbiAgICAgICAgICAgIGlmIChjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlICYmIGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UuZGF0YVRhYmxlKSB7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUuc2VhcmNoKHNlYXJjaFZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgb3B0aW1hbCBwYWdlIGxlbmd0aCBiYXNlZCBvbiB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIFVzZXMgYSBjb25zZXJ2YXRpdmUgZXN0aW1hdGUgc2luY2UgdGhlIHRhYmxlIGNvbnRhaW5lciBpcyBoaWRkZW4gYXQgaW5pdCB0aW1lLlxuICAgICAqIFN1YnRyYWN0cyBvbmUgZXh0cmEgcm93IHRvIGd1YXJhbnRlZSBwYWdpbmF0aW9uIGZpdHMgd2l0aG91dCBzY3JvbGxpbmcuXG4gICAgICogQHJldHVybnMge251bWJlcn0gVGhlIGNhbGN1bGF0ZWQgcGFnZSBsZW5ndGhcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBVc2VyIHByZWZlcmVuY2UgdGFrZXMgcHJpb3JpdHlcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2N1c3RvbUZpbGVzVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGggJiYgc2F2ZWRQYWdlTGVuZ3RoICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludChzYXZlZFBhZ2VMZW5ndGgsIDEwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3Qgcm93SGVpZ2h0ID0gMzg7IC8vIFZlcnkgY29tcGFjdCB0YWJsZSByb3cgaGVpZ2h0IGluY2x1ZGluZyBib3JkZXJzIGFuZCBzdWItcGl4ZWwgZ2Fwc1xuXG4gICAgICAgIC8vIDQ1MCBhY2NvdW50cyBmb3I6IHRvcCBtZW51LCBwYWdlIGhlYWRlciwgY29udHJvbHMgcm93LCB0aGVhZCwgcGFnaW5hdGlvbiwgaW5mbywgdmVyc2lvbiBmb290ZXJcbiAgICAgICAgLy8gT24gbGFyZ2Ugc2NyZWVucyAoPjEwODApIG1hcmdpbnMvcGFkZGluZ3Mgc2NhbGUgdXAsIHNvIHdlIGFkZCBwcm9wb3J0aW9uYWwgb3ZlcmhlYWRcbiAgICAgICAgY29uc3Qgb3ZlcmhlYWQgPSA0NTAgKyBNYXRoLm1heCgwLCB3aW5kb3dIZWlnaHQgLSAxMDgwKSAqIDAuMTU7XG5cbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIG92ZXJoZWFkKSAvIHJvd0hlaWdodCksIDgpO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyB0YWJsZSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlc1RhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19