"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, IvrMenuAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * IVR menu table management module
 */
var ivrMenuIndex = {
  $ivrMenuTable: $('#ivr-menu-table'),
  dataTable: {},

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Initially show placeholder until data loads
    ivrMenuIndex.toggleEmptyPlaceholder(true);
    ivrMenuIndex.initializeDataTable();
  },

  /**
   * Initialize DataTable
   */
  initializeDataTable: function initializeDataTable() {
    ivrMenuIndex.dataTable = ivrMenuIndex.$ivrMenuTable.DataTable({
      ajax: {
        url: IvrMenuAPI.endpoints.getList,
        dataSrc: function dataSrc(json) {
          // Manage empty state
          ivrMenuIndex.toggleEmptyPlaceholder(!json.result || !json.data || json.data.length === 0);
          return json.result ? json.data : [];
        }
      },
      columns: [{
        data: 'extension',
        className: 'centered collapsing',
        render: function render(data) {
          // SECURITY: Properly escape extension data to prevent XSS
          return window.SecurityUtils.escapeHtml(data) || '—';
        }
      }, {
        data: 'name',
        className: 'collapsing',
        render: function render(data) {
          // SECURITY: Properly escape name data to prevent XSS
          return window.SecurityUtils.escapeHtml(data) || '—';
        }
      }, {
        data: 'actions',
        className: 'collapsing',
        render: function render(data) {
          if (!data || data.length === 0) {
            return '<small>—</small>';
          } // SECURITY: Escape digits and sanitize represent field allowing only safe icons


          var actionsHtml = data.map(function (action) {
            var safeDigits = window.SecurityUtils.escapeHtml(action.digits || '');
            var safeRepresent = window.SecurityUtils.sanitizeExtensionsApiContent(action.represent || '');
            return "".concat(safeDigits, " - ").concat(safeRepresent);
          }).join('<br>');
          return "<small>".concat(actionsHtml, "</small>");
        }
      }, {
        data: 'timeoutExtensionRepresent',
        className: 'hide-on-mobile collapsing',
        render: function render(data) {
          // SECURITY: Sanitize timeout extension representation allowing only safe icons
          if (!data) {
            return '<small>—</small>';
          }

          var safeData = window.SecurityUtils.sanitizeExtensionsApiContent(data);
          return "<small>".concat(safeData, "</small>");
        }
      }, {
        data: 'description',
        className: 'hide-on-mobile',
        orderable: false,
        // No collapsing class - this column will stretch to fill remaining space
        render: function render(data) {
          if (!data || data.trim() === '') {
            return '—';
          } // Create popup button for description - properly escape all HTML


          var escapedData = window.SecurityUtils.escapeHtml(data); // Safe escaping

          return "<div class=\"ui basic icon button popuped\" \n                                    data-content=\"".concat(escapedData, "\" \n                                    data-position=\"top right\" \n                                    data-variation=\"wide\">\n                                    <i class=\"file text icon\"></i>\n                                </div>");
        }
      }, {
        data: null,
        orderable: false,
        searchable: false,
        className: 'right aligned collapsing',
        render: function render(data, type, row) {
          return "<div class=\"ui tiny basic icon buttons action-buttons\">\n                            <a href=\"".concat(globalRootUrl, "ivr-menu/modify/").concat(row.uniqid, "\" \n                               class=\"ui button edit popuped\" \n                               data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                                <i class=\"icon edit blue\"></i>\n                            </a>\n                            <a href=\"#\" \n                               data-value=\"").concat(row.uniqid, "\" \n                               class=\"ui button delete two-steps-delete popuped\" \n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"icon trash red\"></i>\n                            </a>\n                        </div>");
        }
      }],
      order: [[0, 'asc']],
      lengthChange: false,
      paging: false,
      searching: true,
      info: false,
      language: SemanticLocalization.dataTableLocalisation,
      drawCallback: function drawCallback() {
        // Initialize Semantic UI elements
        ivrMenuIndex.$ivrMenuTable.find('.popuped').popup(); // Move Add New button to the correct DataTables grid position (like in original)

        var $addButton = $('#add-new-button');
        var $wrapper = $('#ivr-menu-table_wrapper');
        var $leftColumn = $wrapper.find('.eight.wide.column').first();

        if ($addButton.length && $leftColumn.length) {
          // Move button to the left column of DataTables grid
          $leftColumn.append($addButton);
          $addButton.show();
        } // Double-click for editing


        ivrMenuIndex.initializeDoubleClickEdit();
      }
    }); // Handle deletion using DeleteSomething.js
    // DeleteSomething.js automatically handles first click
    // We only listen for second click (when two-steps-delete class is removed)

    ivrMenuIndex.$ivrMenuTable.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var menuId = $button.attr('data-value'); // Add loading indicator and disable button

      $button.addClass('loading disabled');
      IvrMenuAPI.deleteRecord(menuId, ivrMenuIndex.cbAfterDeleteRecord);
    });
  },

  /**
   * Callback after record deletion
   */
  cbAfterDeleteRecord: function cbAfterDeleteRecord(response) {
    if (response.result === true) {
      // Reload table
      ivrMenuIndex.dataTable.ajax.reload(); // Update related components

      if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
        Extensions.cbOnDataChanged();
      }

      UserMessage.showSuccess(globalTranslate.iv_IvrMenuDeleted);
    } else {
      var _response$messages;

      UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || globalTranslate.iv_ImpossibleToDeleteIvrMenu);
    } // Remove loading indicator and restore button to initial state


    $('a.delete').removeClass('loading disabled');
  },

  /**
   * Toggle empty table placeholder visibility
   */
  toggleEmptyPlaceholder: function toggleEmptyPlaceholder(isEmpty) {
    if (isEmpty) {
      $('#ivr-table-container').hide();
      $('#add-new-button').hide();
      $('#empty-table-placeholder').show();
    } else {
      $('#empty-table-placeholder').hide();
      $('#add-new-button').show();
      $('#ivr-table-container').show();
    }
  },

  /**
   * Initialize double-click for editing
   * IMPORTANT: Exclude cells with ui right aligned class to avoid conflict with delete-something.js
   */
  initializeDoubleClickEdit: function initializeDoubleClickEdit() {
    ivrMenuIndex.$ivrMenuTable.on('dblclick', 'tbody td:not(.ui.right.aligned)', function () {
      var data = ivrMenuIndex.dataTable.row(this).data();

      if (data && data.uniqid) {
        window.location = "".concat(globalRootUrl, "ivr-menu/modify/").concat(data.uniqid);
      }
    });
  },

  /**
   * Cleanup event handlers
   */
  destroy: function destroy() {
    // Destroy DataTable if exists
    if (ivrMenuIndex.dataTable) {
      ivrMenuIndex.dataTable.destroy();
    }
  }
};
/**
 *  Initialize IVR menu table on document ready
 */

$(document).ready(function () {
  ivrMenuIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOlsiaXZyTWVudUluZGV4IiwiJGl2ck1lbnVUYWJsZSIsIiQiLCJkYXRhVGFibGUiLCJpbml0aWFsaXplIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJhamF4IiwidXJsIiwiSXZyTWVudUFQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsImRhdGEiLCJsZW5ndGgiLCJjb2x1bW5zIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwid2luZG93IiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJhY3Rpb25zSHRtbCIsIm1hcCIsImFjdGlvbiIsInNhZmVEaWdpdHMiLCJkaWdpdHMiLCJzYWZlUmVwcmVzZW50Iiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsInJlcHJlc2VudCIsImpvaW4iLCJzYWZlRGF0YSIsIm9yZGVyYWJsZSIsInRyaW0iLCJlc2NhcGVkRGF0YSIsInNlYXJjaGFibGUiLCJ0eXBlIiwicm93IiwiZ2xvYmFsUm9vdFVybCIsInVuaXFpZCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsIm9yZGVyIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJmaW5kIiwicG9wdXAiLCIkYWRkQnV0dG9uIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwic2hvdyIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJtZW51SWQiLCJhdHRyIiwiYWRkQ2xhc3MiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwicmVzcG9uc2UiLCJyZWxvYWQiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93U3VjY2VzcyIsIml2X0l2ck1lbnVEZWxldGVkIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsIml2X0ltcG9zc2libGVUb0RlbGV0ZUl2ck1lbnUiLCJyZW1vdmVDbGFzcyIsImlzRW1wdHkiLCJoaWRlIiwibG9jYXRpb24iLCJkZXN0cm95IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQkMsRUFBQUEsYUFBYSxFQUFFQyxDQUFDLENBQUMsaUJBQUQsQ0FEQztBQUVqQkMsRUFBQUEsU0FBUyxFQUFFLEVBRk07O0FBTWpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQVRpQix3QkFTSjtBQUNUO0FBQ0FKLElBQUFBLFlBQVksQ0FBQ0ssc0JBQWIsQ0FBb0MsSUFBcEM7QUFFQUwsSUFBQUEsWUFBWSxDQUFDTSxtQkFBYjtBQUNILEdBZGdCOztBQWdCakI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG1CQW5CaUIsaUNBbUJLO0FBQ2xCTixJQUFBQSxZQUFZLENBQUNHLFNBQWIsR0FBeUJILFlBQVksQ0FBQ0MsYUFBYixDQUEyQk0sU0FBM0IsQ0FBcUM7QUFDMURDLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxHQUFHLEVBQUVDLFVBQVUsQ0FBQ0MsU0FBWCxDQUFxQkMsT0FEeEI7QUFFRkMsUUFBQUEsT0FBTyxFQUFFLGlCQUFTQyxJQUFULEVBQWU7QUFDcEI7QUFDQWQsVUFBQUEsWUFBWSxDQUFDSyxzQkFBYixDQUNJLENBQUNTLElBQUks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LHFCQXVOUDtBQUNOO0FBQ0EsUUFBSXZGLFlBQVksQ0FBQ0csU0FBakIsRUFBNEI7QUFDeEJILE1BQUFBLFlBQVksQ0FBQ0csU0FBYixDQUF1Qm9GLE9BQXZCO0FBQ0g7QUFDSjtBQTVOZ0IsQ0FBckI7QUErTkE7QUFDQTtBQUNBOztBQUNBckYsQ0FBQyxDQUFDc0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpGLEVBQUFBLFlBQVksQ0FBQ0ksVUFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRXh0ZW5zaW9ucywgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuLyoqXG4gKiBJVlIgbWVudSB0YWJsZSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51SW5kZXggPSB7XG4gICAgJGl2ck1lbnVUYWJsZTogJCgnI2l2ci1tZW51LXRhYmxlJyksXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsbHkgc2hvdyBwbGFjZWhvbGRlciB1bnRpbCBkYXRhIGxvYWRzXG4gICAgICAgIGl2ck1lbnVJbmRleC50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgaXZyTWVudUluZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgaXZyTWVudUluZGV4LmRhdGFUYWJsZSA9IGl2ck1lbnVJbmRleC4kaXZyTWVudVRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiBJdnJNZW51QVBJLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFuYWdlIGVtcHR5IHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIGl2ck1lbnVJbmRleC50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgIWpzb24ucmVzdWx0IHx8ICFqc29uLmRhdGEgfHwganNvbi5kYXRhLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ganNvbi5yZXN1bHQgPyBqc29uLmRhdGEgOiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NlbnRlcmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBQcm9wZXJseSBlc2NhcGUgZXh0ZW5zaW9uIGRhdGEgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEpIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICduYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU0VDVVJJVFk6IFByb3Blcmx5IGVzY2FwZSBuYW1lIGRhdGEgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEpIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdhY3Rpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8c21hbGw+4oCUPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU0VDVVJJVFk6IEVzY2FwZSBkaWdpdHMgYW5kIHNhbml0aXplIHJlcHJlc2VudCBmaWVsZCBhbGxvd2luZyBvbmx5IHNhZmUgaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbnNIdG1sID0gZGF0YS5tYXAoYWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGlnaXRzID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChhY3Rpb24uZGlnaXRzIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlUmVwcmVzZW50ID0gd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChhY3Rpb24ucmVwcmVzZW50IHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7c2FmZURpZ2l0c30gLSAke3NhZmVSZXByZXNlbnR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNtYWxsPiR7YWN0aW9uc0h0bWx9PC9zbWFsbD5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd0aW1lb3V0RXh0ZW5zaW9uUmVwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUgY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIHRpbWVvdXQgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIGFsbG93aW5nIG9ubHkgc2FmZSBpY29uc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8c21hbGw+4oCUPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZURhdGEgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c21hbGw+JHtzYWZlRGF0YX08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAvLyBObyBjb2xsYXBzaW5nIGNsYXNzIC0gdGhpcyBjb2x1bW4gd2lsbCBzdHJldGNoIHRvIGZpbGwgcmVtYWluaW5nIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBwb3B1cCBidXR0b24gZm9yIGRlc2NyaXB0aW9uIC0gcHJvcGVybHkgZXNjYXBlIGFsbCBIVE1MXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlc2NhcGVkRGF0YSA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7IC8vIFNhZmUgZXNjYXBpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7ZXNjYXBlZERhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ3JpZ2h0IGFsaWduZWQgY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvbW9kaWZ5LyR7cm93LnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtyb3cudW5pcWlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMCwgJ2FzYyddXSxcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgaXZyTWVudUluZGV4LiRpdnJNZW51VGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gdGhlIGNvcnJlY3QgRGF0YVRhYmxlcyBncmlkIHBvc2l0aW9uIChsaWtlIGluIG9yaWdpbmFsKVxuICAgICAgICAgICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoJyNpdnItbWVudS10YWJsZV93cmFwcGVyJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTW92ZSBidXR0b24gdG8gdGhlIGxlZnQgY29sdW1uIG9mIERhdGFUYWJsZXMgZ3JpZFxuICAgICAgICAgICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgICAgICAgICAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRpb24gdXNpbmcgRGVsZXRlU29tZXRoaW5nLmpzXG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2Ugb25seSBsaXN0ZW4gZm9yIHNlY29uZCBjbGljayAod2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWQpXG4gICAgICAgIGl2ck1lbnVJbmRleC4kaXZyTWVudVRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBtZW51SWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgaW5kaWNhdG9yIGFuZCBkaXNhYmxlIGJ1dHRvblxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBJdnJNZW51QVBJLmRlbGV0ZVJlY29yZChtZW51SWQsIGl2ck1lbnVJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZVxuICAgICAgICAgICAgaXZyTWVudUluZGV4LmRhdGFUYWJsZS5hamF4LnJlbG9hZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1N1Y2Nlc3MoZ2xvYmFsVHJhbnNsYXRlLml2X0l2ck1lbnVEZWxldGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0ltcG9zc2libGVUb0RlbGV0ZUl2ck1lbnVcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGluZGljYXRvciBhbmQgcmVzdG9yZSBidXR0b24gdG8gaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1wdHkgdGFibGUgcGxhY2Vob2xkZXIgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSkge1xuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJCgnI2l2ci10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjaXZyLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBJTVBPUlRBTlQ6IEV4Y2x1ZGUgY2VsbHMgd2l0aCB1aSByaWdodCBhbGlnbmVkIGNsYXNzIHRvIGF2b2lkIGNvbmZsaWN0IHdpdGggZGVsZXRlLXNvbWV0aGluZy5qc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIGl2ck1lbnVJbmRleC4kaXZyTWVudVRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnVpLnJpZ2h0LmFsaWduZWQpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gaXZyTWVudUluZGV4LmRhdGFUYWJsZS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS8ke2RhdGEudW5pcWlkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoaXZyTWVudUluZGV4LmRhdGFUYWJsZSkge1xuICAgICAgICAgICAgaXZyTWVudUluZGV4LmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIElWUiBtZW51IHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==