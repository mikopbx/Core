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
        className: 'centered collapsing'
      }, {
        data: 'name',
        className: 'collapsing'
      }, {
        data: 'actions',
        className: 'collapsing',
        render: function render(data) {
          if (!data || data.length === 0) {
            return '<small>—</small>';
          }

          var actionsHtml = data.map(function (action) {
            return "".concat(action.digits, " - ").concat(action.represent);
          }).join('<br>');
          return "<small>".concat(actionsHtml, "</small>");
        }
      }, {
        data: 'timeoutExtensionRepresent',
        className: 'hide-on-mobile collapsing',
        render: function render(data) {
          return data ? "<small>".concat(data, "</small>") : '<small>—</small>';
        }
      }, {
        data: 'description',
        className: 'hide-on-mobile',
        orderable: false,
        // No collapsing class - this column will stretch to fill remaining space
        render: function render(data) {
          if (!data || data.trim() === '') {
            return '—';
          } // Create popup button for description like in original


          return "<div class=\"ui basic icon button popuped\" \n                                    data-content=\"".concat(data.replace(/"/g, '&quot;'), "\" \n                                    data-position=\"top right\" \n                                    data-variation=\"wide\">\n                                    <i class=\"file text icon\"></i>\n                                </div>");
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
      info: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtaW5kZXguanMiXSwibmFtZXMiOlsiaXZyTWVudUluZGV4IiwiJGl2ck1lbnVUYWJsZSIsIiQiLCJkYXRhVGFibGUiLCJpbml0aWFsaXplIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJhamF4IiwidXJsIiwiSXZyTWVudUFQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsImRhdGEiLCJsZW5ndGgiLCJjb2x1bW5zIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwiYWN0aW9uc0h0bWwiLCJtYXAiLCJhY3Rpb24iLCJkaWdpdHMiLCJyZXByZXNlbnQiLCJqb2luIiwib3JkZXJhYmxlIiwidHJpbSIsInJlcGxhY2UiLCJzZWFyY2hhYmxlIiwidHlwZSIsInJvdyIsImdsb2JhbFJvb3RVcmwiLCJ1bmlxaWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJvcmRlciIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiZmluZCIsInBvcHVwIiwiJGFkZEJ1dHRvbiIsIiR3cmFwcGVyIiwiJGxlZnRDb2x1bW4iLCJmaXJzdCIsImFwcGVuZCIsInNob3ciLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwibWVudUlkIiwiYXR0ciIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInJlc3BvbnNlIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd1N1Y2Nlc3MiLCJpdl9JdnJNZW51RGVsZXRlZCIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJpdl9JbXBvc3NpYmxlVG9EZWxldGVJdnJNZW51IiwicmVtb3ZlQ2xhc3MiLCJpc0VtcHR5IiwiaGlkZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakJDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGlCQUFELENBREM7QUFFakJDLEVBQUFBLFNBQVMsRUFBRSxFQUZNOztBQUlqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFQaUIsd0JBT0o7QUFDVDtBQUNBSixJQUFBQSxZQUFZLENBQUNLLHNCQUFiLENBQW9DLElBQXBDO0FBRUFMLElBQUFBLFlBQVksQ0FBQ00sbUJBQWI7QUFDSCxHQVpnQjs7QUFjakI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG1CQWpCaUIsaUNBaUJLO0FBQ2xCTixJQUFBQSxZQUFZLENBQUNHLFNBQWIsR0FBeUJILFlBQVksQ0FBQ0MsYUFBYixDQUEyQk0sU0FBM0IsQ0FBcUM7QUFDMURDLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxHQUFHLEVBQUVDLFVBQVUsQ0FBQ0MsU0FBWCxDQUFxQkMsT0FEeEI7QUFFRkMsUUFBQUEsT0FBTyxFQUFFLGlCQUFTQyxJQUFULEVBQWU7QUFDcEI7QUFDQWQsVUFBQUEsWUFBWSxDQUFDSyxzQkFBYixDQUNJLENBQUNTLElBQUksQ0FBQ0MsTUFBTixJQUFnQixDQUFDRCxJQUFJLENBQUNFLElBQXRCLElBQThCRixJQUFJLENBQUNFLElBQUwsQ0FBVUMsTUFBVixLQUFxQixDQUR2RDtBQUdBLGlCQUFPSCxJQUFJLENBQUNDLE1BQUwsR0FB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SUFBSUEsSUFBSSxDQUFDa0IsTUFBakIsRUFBeUI7QUFDckI0QyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUI5QyxhQUFyQiw2QkFBcURqQixJQUFJLENBQUNrQixNQUExRDtBQUNIO0FBQ0osS0FMRDtBQU1ILEdBOUxnQjs7QUFnTWpCO0FBQ0o7QUFDQTtBQUNJOEMsRUFBQUEsT0FuTWlCLHFCQW1NUDtBQUNOO0FBQ0EsUUFBSWhGLFlBQVksQ0FBQ0csU0FBakIsRUFBNEI7QUFDeEJILE1BQUFBLFlBQVksQ0FBQ0csU0FBYixDQUF1QjZFLE9BQXZCO0FBQ0g7QUFDSjtBQXhNZ0IsQ0FBckI7QUEyTUE7QUFDQTtBQUNBOztBQUNBOUUsQ0FBQyxDQUFDK0UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxGLEVBQUFBLFlBQVksQ0FBQ0ksVUFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRXh0ZW5zaW9ucywgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuLyoqXG4gKiBJVlIgbWVudSB0YWJsZSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51SW5kZXggPSB7XG4gICAgJGl2ck1lbnVUYWJsZTogJCgnI2l2ci1tZW51LXRhYmxlJyksXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxseSBzaG93IHBsYWNlaG9sZGVyIHVudGlsIGRhdGEgbG9hZHNcbiAgICAgICAgaXZyTWVudUluZGV4LnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBpdnJNZW51SW5kZXguZGF0YVRhYmxlID0gaXZyTWVudUluZGV4LiRpdnJNZW51VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEl2ck1lbnVBUEkuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYW5hZ2UgZW1wdHkgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgaXZyTWVudUluZGV4LnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAhanNvbi5yZXN1bHQgfHwgIWpzb24uZGF0YSB8fCBqc29uLmRhdGEubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqc29uLnJlc3VsdCA/IGpzb24uZGF0YSA6IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY2VudGVyZWQgY29sbGFwc2luZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ25hbWUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjb2xsYXBzaW5nJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnYWN0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnPHNtYWxsPuKAlDwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbnNIdG1sID0gZGF0YS5tYXAoYWN0aW9uID0+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAke2FjdGlvbi5kaWdpdHN9IC0gJHthY3Rpb24ucmVwcmVzZW50fWBcbiAgICAgICAgICAgICAgICAgICAgICAgICkuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c21hbGw+JHthY3Rpb25zSHRtbH08L3NtYWxsPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3RpbWVvdXRFeHRlbnNpb25SZXByZXNlbnQnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdoaWRlLW9uLW1vYmlsZSBjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSA/IGA8c21hbGw+JHtkYXRhfTwvc21hbGw+YCA6ICc8c21hbGw+4oCUPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2hpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gY29sbGFwc2luZyBjbGFzcyAtIHRoaXMgY29sdW1uIHdpbGwgc3RyZXRjaCB0byBmaWxsIHJlbWFpbmluZyBzcGFjZVxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgcG9wdXAgYnV0dG9uIGZvciBkZXNjcmlwdGlvbiBsaWtlIGluIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2RhdGEucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZpbGUgdGV4dCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS8ke3Jvdy51bmlxaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cm93LnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbWzAsICdhc2MnXV0sXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGluZm86IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgaXZyTWVudUluZGV4LiRpdnJNZW51VGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gdGhlIGNvcnJlY3QgRGF0YVRhYmxlcyBncmlkIHBvc2l0aW9uIChsaWtlIGluIG9yaWdpbmFsKVxuICAgICAgICAgICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoJyNpdnItbWVudS10YWJsZV93cmFwcGVyJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTW92ZSBidXR0b24gdG8gdGhlIGxlZnQgY29sdW1uIG9mIERhdGFUYWJsZXMgZ3JpZFxuICAgICAgICAgICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgICAgICAgICAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRpb24gdXNpbmcgRGVsZXRlU29tZXRoaW5nLmpzXG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2Ugb25seSBsaXN0ZW4gZm9yIHNlY29uZCBjbGljayAod2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWQpXG4gICAgICAgIGl2ck1lbnVJbmRleC4kaXZyTWVudVRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBtZW51SWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgaW5kaWNhdG9yIGFuZCBkaXNhYmxlIGJ1dHRvblxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBJdnJNZW51QVBJLmRlbGV0ZVJlY29yZChtZW51SWQsIGl2ck1lbnVJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZVxuICAgICAgICAgICAgaXZyTWVudUluZGV4LmRhdGFUYWJsZS5hamF4LnJlbG9hZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1N1Y2Nlc3MoZ2xvYmFsVHJhbnNsYXRlLml2X0l2ck1lbnVEZWxldGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0ltcG9zc2libGVUb0RlbGV0ZUl2ck1lbnVcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGluZGljYXRvciBhbmQgcmVzdG9yZSBidXR0b24gdG8gaW5pdGlhbCBzdGF0ZVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1wdHkgdGFibGUgcGxhY2Vob2xkZXIgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSkge1xuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJCgnI2l2ci10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjaXZyLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBJTVBPUlRBTlQ6IEV4Y2x1ZGUgY2VsbHMgd2l0aCB1aSByaWdodCBhbGlnbmVkIGNsYXNzIHRvIGF2b2lkIGNvbmZsaWN0IHdpdGggZGVsZXRlLXNvbWV0aGluZy5qc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIGl2ck1lbnVJbmRleC4kaXZyTWVudVRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnVpLnJpZ2h0LmFsaWduZWQpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gaXZyTWVudUluZGV4LmRhdGFUYWJsZS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS8ke2RhdGEudW5pcWlkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoaXZyTWVudUluZGV4LmRhdGFUYWJsZSkge1xuICAgICAgICAgICAgaXZyTWVudUluZGV4LmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIElWUiBtZW51IHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpdnJNZW51SW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==