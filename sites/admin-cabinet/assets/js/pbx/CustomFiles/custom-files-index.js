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
   * jQuery object for the page length dropdown.
   * Resolved in initialize() — must not call $() at module-load time.
   */
  $pageLengthDropdown: null,

  /**
   * Initializes the custom files table, applying DataTable features and setting up event handlers.
   */
  initialize: function initialize() {
    customFilesTable.$pageLengthDropdown = $('#page-length-select'); // Initialize dropdown for page length selection

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtaW5kZXguanMiXSwibmFtZXMiOlsiY3VzdG9tRmlsZXNUYWJsZSIsImRhdGFUYWJsZUluc3RhbmNlIiwiJHBhZ2VMZW5ndGhEcm9wZG93biIsImluaXRpYWxpemUiLCIkIiwiaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93biIsIlBieERhdGFUYWJsZUluZGV4IiwidGFibGVJZCIsImFwaU1vZHVsZSIsImN1c3RvbUZpbGVzQVBJIiwiYXBpTWV0aG9kIiwicm91dGVQcmVmaXgiLCJzaG93U3VjY2Vzc01lc3NhZ2VzIiwic2hvd0luZm8iLCJhY3Rpb25CdXR0b25zIiwidHJhbnNsYXRpb25zIiwiZGVsZXRlRXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlIiwiZGVsZXRlRGlzYWJsZWRUb29sdGlwIiwiY2ZfQ2Fubm90RGVsZXRlU3lzdGVtRmlsZSIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsInJvdyIsIm1vZGUiLCJkYXRhVGFibGVPcHRpb25zIiwicGFnaW5nIiwicGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJsZW5ndGhNZW51IiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nVHlwZSIsInNlYXJjaGluZyIsImRvbSIsImNvbHVtbnMiLCJkYXRhIiwicmVuZGVyIiwidHlwZSIsImNsYXNzTmFtZSIsIm1vZGVLZXkiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwib3JkZXJhYmxlIiwibGVuZ3RoIiwib25EcmF3Q2FsbGJhY2siLCIkdGFibGUiLCJmaW5kIiwicG9wdXAiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJzYXZlZFBhZ2VMZW5ndGgiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwiZGF0YVRhYmxlIiwicGFnZSIsImxlbiIsImRyYXciLCJvbiIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwiZm9jdXMiLCJzZWFyY2hWYWx1ZSIsInZhbCIsInNlYXJjaCIsInBhcnNlSW50Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJyb3dIZWlnaHQiLCJvdmVyaGVhZCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFKRTs7QUFNckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUUsSUFWQTs7QUFZckI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBZnFCLHdCQWVSO0FBQ1RILElBQUFBLGdCQUFnQixDQUFDRSxtQkFBakIsR0FBdUNFLENBQUMsQ0FBQyxxQkFBRCxDQUF4QyxDQURTLENBR1Q7O0FBQ0FKLElBQUFBLGdCQUFnQixDQUFDSyw0QkFBakIsR0FKUyxDQU1UOztBQUNBLFNBQUtKLGlCQUFMLEdBQXlCLElBQUlLLGlCQUFKLENBQXNCO0FBQzNDQyxNQUFBQSxPQUFPLEVBQUUsb0JBRGtDO0FBRTNDQyxNQUFBQSxTQUFTLEVBQUVDLGNBRmdDO0FBRzNDQyxNQUFBQSxTQUFTLEVBQUUsWUFIZ0M7QUFHbEI7QUFDekJDLE1BQUFBLFdBQVcsRUFBRSxjQUo4QjtBQUszQ0MsTUFBQUEsbUJBQW1CLEVBQUUsS0FMc0I7QUFLZjtBQUM1QkMsTUFBQUEsUUFBUSxFQUFFLElBTmlDO0FBTTNCO0FBQ2hCQyxNQUFB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Q2xCLGVBQUQsRUFBa0IsRUFBbEIsQ0FBZjtBQUNIOztBQUVELFFBQU1tQixZQUFZLEdBQUdDLE1BQU0sQ0FBQ0MsV0FBNUI7QUFDQSxRQUFNQyxTQUFTLEdBQUcsRUFBbEIsQ0FSa0IsQ0FRSTtBQUV0QjtBQUNBOztBQUNBLFFBQU1DLFFBQVEsR0FBRyxNQUFNQyxJQUFJLENBQUNDLEdBQUwsQ0FBUyxDQUFULEVBQVlOLFlBQVksR0FBRyxJQUEzQixJQUFtQyxJQUExRDtBQUVBLFdBQU9LLElBQUksQ0FBQ0MsR0FBTCxDQUFTRCxJQUFJLENBQUNFLEtBQUwsQ0FBVyxDQUFDUCxZQUFZLEdBQUdJLFFBQWhCLElBQTRCRCxTQUF2QyxDQUFULEVBQTRELENBQTVELENBQVA7QUFDSDtBQXRMb0IsQ0FBekIsQyxDQXlMQTs7QUFDQXhFLENBQUMsQ0FBQzZFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsRixFQUFBQSxnQkFBZ0IsQ0FBQ0csVUFBakI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLypcbiAqIEN1c3RvbSBGaWxlcyB0YWJsZSBtYW5hZ2VtZW50IG1vZHVsZSB1c2luZyB1bmlmaWVkIGJhc2UgY2xhc3NcbiAqXG4gKiBJbXBsZW1lbnRzIERhdGFUYWJsZSB3aXRoIFNlbWFudGljIFVJIGZvbGxvd2luZyBndWlkZWxpbmVzLFxuICogbG9hZHMgZGF0YSB2aWEgUkVTVCBBUEkgdjMsIGFuZCBmb2xsb3dzIE1pa29QQlggc3RhbmRhcmRzLlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBjdXN0b21GaWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFBieERhdGFUYWJsZUluZGV4ICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBoYW5kbGluZyBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgY3VzdG9tIGZpbGVzIHRhYmxlLlxuICogQG1vZHVsZSBjdXN0b21GaWxlc1RhYmxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGVzVGFibGUgPSB7XG4gICAgLyoqXG4gICAgICogRGF0YVRhYmxlIGluc3RhbmNlIGZyb20gYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGRhdGFUYWJsZUluc3RhbmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHBhZ2UgbGVuZ3RoIGRyb3Bkb3duLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aERyb3Bkb3duOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbSBmaWxlcyB0YWJsZSwgYXBwbHlpbmcgRGF0YVRhYmxlIGZlYXR1cmVzIGFuZCBzZXR0aW5nIHVwIGV2ZW50IGhhbmRsZXJzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGN1c3RvbUZpbGVzVGFibGUuJHBhZ2VMZW5ndGhEcm9wZG93biA9ICQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGZvciBwYWdlIGxlbmd0aCBzZWxlY3Rpb25cbiAgICAgICAgY3VzdG9tRmlsZXNUYWJsZS5pbml0aWFsaXplUGFnZUxlbmd0aERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlIG9mIGJhc2UgY2xhc3Mgd2l0aCBDdXN0b20gRmlsZXMgc3BlY2lmaWMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmRhdGFUYWJsZUluc3RhbmNlID0gbmV3IFBieERhdGFUYWJsZUluZGV4KHtcbiAgICAgICAgICAgIHRhYmxlSWQ6ICdjdXN0b20tZmlsZXMtdGFibGUnLFxuICAgICAgICAgICAgYXBpTW9kdWxlOiBjdXN0b21GaWxlc0FQSSxcbiAgICAgICAgICAgIGFwaU1ldGhvZDogJ2dldFJlY29yZHMnLCAvLyBVc2UgdGhlIHN0YW5kYXJkIG1ldGhvZCBuYW1lXG4gICAgICAgICAgICByb3V0ZVByZWZpeDogJ2N1c3RvbS1maWxlcycsXG4gICAgICAgICAgICBzaG93U3VjY2Vzc01lc3NhZ2VzOiBmYWxzZSwgLy8gU2lsZW50IG9wZXJhdGlvbiAtIGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkc1xuICAgICAgICAgICAgc2hvd0luZm86IHRydWUsIC8vIFNob3cgRGF0YVRhYmxlIGluZm8gZm9yIHBhZ2luYXRpb25cbiAgICAgICAgICAgIGFjdGlvbkJ1dHRvbnM6IFsnZWRpdCcsICdkZWxldGUnXSwgLy8gRWRpdCBhbmQgZGVsZXRlIGJ1dHRvbnMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgZGVsZXRlRXJyb3I6IGdsb2JhbFRyYW5zbGF0ZS5jZl9JbXBvc3NpYmxlVG9EZWxldGVGaWxlLFxuICAgICAgICAgICAgICAgIGRlbGV0ZURpc2FibGVkVG9vbHRpcDogZ2xvYmFsVHJhbnNsYXRlLmNmX0Nhbm5vdERlbGV0ZVN5c3RlbUZpbGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBDdXN0b20gZGVsZXRlIHBlcm1pc3Npb24gY2hlY2sgLSBvbmx5IGFsbG93IGRlbGV0ZSBmb3IgY3VzdG9tIG1vZGUgZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjazogKHJvdykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgYWxsb3cgZGVsZXRpb24gb2YgZmlsZXMgd2l0aCBtb2RlID09PSAnY3VzdG9tJ1xuICAgICAgICAgICAgICAgIHJldHVybiByb3cubW9kZSA9PT0gJ2N1c3RvbSc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YVRhYmxlT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSwgLy8gRW5hYmxlIHBhZ2luYXRpb25cbiAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoOiBjdXN0b21GaWxlc1RhYmxlLmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSwgLy8gQ2FsY3VsYXRlIGluaXRpYWwgcGFnZSBsZW5ndGhcbiAgICAgICAgICAgICAgICBsZW5ndGhNZW51OiBbWzI1LCAxMDBdLCBbMjUsIDEwMF1dLCAvLyBQYWdlIHNpemUgb3B0aW9ucyAtIHNpbXBsaWZpZWRcbiAgICAgICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLCAvLyBXZSB1c2UgY3VzdG9tIGRyb3Bkb3duIGluc3RlYWQgb2YgYnVpbHQtaW5cbiAgICAgICAgICAgICAgICBwYWdpbmdUeXBlOiAnc2ltcGxlX251bWJlcnMnLCAvLyBTaG93IHBhZ2UgbnVtYmVyc1xuICAgICAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSwgLy8gRW5hYmxlIHNlYXJjaGluZyBmdW5jdGlvbmFsaXR5XG4gICAgICAgICAgICAgICAgZG9tOiAncnRpcCcgLy8gUmVtb3ZlIGZpbHRlciAoZikgYW5kIGxlbmd0aCAobCkgZnJvbSBET00sIGtlZXAgb25seSBwcm9jZXNzaW5nIChyKSwgdGFibGUgKHQpLCBpbmZvIChpKSwgcGFnaW5hdGlvbiAocClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vZGUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2xhdGUgbW9kZSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlS2V5ID0gJ2NmX0ZpbGVBY3Rpb25zJyArIChkYXRhIHx8ICdOb25lJykuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyAoZGF0YSB8fCAnbm9uZScpLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGVbbW9kZUtleV0gfHwgZGF0YSB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGRlc2NyaXB0aW9uIGlzIGxvbmcsIHNob3cgaXQgaW4gYSBwb3B1cFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2RhdGF9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uRHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgbG9uZyBkZXNjcmlwdGlvbnNcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCcucG9wdXBlZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd3aWRlJyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBiYXNlIGNsYXNzXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlSW5zdGFuY2UuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwYWdlIGxlbmd0aCBkcm9wZG93biB3aXRoIFNlbWFudGljIFVJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhZ2VMZW5ndGhEcm9wZG93bigpIHtcbiAgICAgICAgLy8gR2V0IHNhdmVkIHBhZ2UgbGVuZ3RoIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjdXN0b21GaWxlc1RhYmxlUGFnZUxlbmd0aCcpO1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlIG9mIGRyb3Bkb3duXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGggJiYgc2F2ZWRQYWdlTGVuZ3RoICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzVGFibGUuJHBhZ2VMZW5ndGhEcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjaGFuZ2UgaGFuZGxlclxuICAgICAgICBjdXN0b21GaWxlc1RhYmxlLiRwYWdlTGVuZ3RoRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGN1c3RvbUZpbGVzVGFibGUuY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgRGF0YVRhYmxlIHBhZ2UgbGVuZ3RoIGlmIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZSAmJiBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGRyb3Bkb3duIGZyb20gY2xvc2luZyB0aGUgc2VhcmNoIGlucHV0XG4gICAgICAgIGN1c3RvbUZpbGVzVGFibGUuJHBhZ2VMZW5ndGhEcm9wZG93bi5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiBjbGlja2luZyBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoJyNnbG9iYWwtc2VhcmNoJykuZm9jdXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHNlYXJjaCBpbnB1dFxuICAgICAgICAkKCcjZ2xvYmFsLXNlYXJjaCcpLm9uKCdrZXl1cCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gJCh0aGlzKS52YWwoKTtcbiAgICAgICAgICAgIC8vIFVzZSBEYXRhVGFibGVzIGJ1aWx0LWluIHNlYXJjaFxuICAgICAgICAgICAgaWYgKGN1c3RvbUZpbGVzVGFibGUuZGF0YVRhYmxlSW5zdGFuY2UgJiYgY3VzdG9tRmlsZXNUYWJsZS5kYXRhVGFibGVJbnN0YW5jZS5kYXRhVGFibGUpIHtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlc1RhYmxlLmRhdGFUYWJsZUluc3RhbmNlLmRhdGFUYWJsZS5zZWFyY2goc2VhcmNoVmFsdWUpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBvcHRpbWFsIHBhZ2UgbGVuZ3RoIGJhc2VkIG9uIHdpbmRvdyBoZWlnaHQuXG4gICAgICogVXNlcyBhIGNvbnNlcnZhdGl2ZSBlc3RpbWF0ZSBzaW5jZSB0aGUgdGFibGUgY29udGFpbmVyIGlzIGhpZGRlbiBhdCBpbml0IHRpbWUuXG4gICAgICogU3VidHJhY3RzIG9uZSBleHRyYSByb3cgdG8gZ3VhcmFudGVlIHBhZ2luYXRpb24gZml0cyB3aXRob3V0IHNjcm9sbGluZy5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBUaGUgY2FsY3VsYXRlZCBwYWdlIGxlbmd0aFxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIFVzZXIgcHJlZmVyZW5jZSB0YWtlcyBwcmlvcml0eVxuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VzdG9tRmlsZXNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCAmJiBzYXZlZFBhZ2VMZW5ndGggIT09ICdhdXRvJykge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHNhdmVkUGFnZUxlbmd0aCwgMTApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCByb3dIZWlnaHQgPSAzODsgLy8gVmVyeSBjb21wYWN0IHRhYmxlIHJvdyBoZWlnaHQgaW5jbHVkaW5nIGJvcmRlcnMgYW5kIHN1Yi1waXhlbCBnYXBzXG5cbiAgICAgICAgLy8gNDUwIGFjY291bnRzIGZvcjogdG9wIG1lbnUsIHBhZ2UgaGVhZGVyLCBjb250cm9scyByb3csIHRoZWFkLCBwYWdpbmF0aW9uLCBpbmZvLCB2ZXJzaW9uIGZvb3RlclxuICAgICAgICAvLyBPbiBsYXJnZSBzY3JlZW5zICg+MTA4MCkgbWFyZ2lucy9wYWRkaW5ncyBzY2FsZSB1cCwgc28gd2UgYWRkIHByb3BvcnRpb25hbCBvdmVyaGVhZFxuICAgICAgICBjb25zdCBvdmVyaGVhZCA9IDQ1MCArIE1hdGgubWF4KDAsIHdpbmRvd0hlaWdodCAtIDEwODApICogMC4xNTtcblxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gb3ZlcmhlYWQpIC8gcm93SGVpZ2h0KSwgOCk7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIHRhYmxlIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=