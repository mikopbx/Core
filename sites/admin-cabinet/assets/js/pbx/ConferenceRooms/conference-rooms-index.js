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

/* global globalRootUrl, ConferenceRoomsAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Модуль управления таблицей конференций
 */
var conferenceTable = {
  $conferencesTable: $('#conference-rooms-table'),
  dataTable: {},

  /**
   * Conference table management module
   */
  initialize: function initialize() {
    // Initially show placeholder until data loads
    conferenceTable.toggleEmptyPlaceholder(true);
    conferenceTable.initializeDataTable();
  },

  /**
   * Initialize DataTable
   */
  initializeDataTable: function initializeDataTable() {
    conferenceTable.dataTable = conferenceTable.$conferencesTable.DataTable({
      ajax: {
        url: ConferenceRoomsAPI.endpoints.getList,
        dataSrc: function dataSrc(json) {
          console.log('API Response:', json); // Debug log
          // Manage empty state

          conferenceTable.toggleEmptyPlaceholder(!json.result || !json.data || json.data.length === 0);
          return json.result ? json.data : [];
        }
      },
      columns: [{
        data: 'name',
        render: function render(data, type, row) {
          return "<strong>".concat(data, "</strong>");
        }
      }, {
        data: 'extension',
        className: 'center aligned'
      }, {
        data: 'pinCode',
        className: 'center aligned hide-on-mobile',
        responsivePriority: 2,
        render: function render(data) {
          return data || '—';
        }
      }, {
        data: null,
        orderable: false,
        searchable: false,
        className: 'right aligned action-buttons',
        // Added class for identification
        responsivePriority: 1,
        render: function render(data, type, row) {
          return "<div class=\"ui basic icon buttons\">\n                            <a href=\"".concat(globalRootUrl, "conference-rooms/modify/").concat(row.uniqid, "\" \n                               class=\"ui button popuped\" \n                               data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                                <i class=\"edit icon\"></i>\n                            </a>\n                            <a href=\"#\" \n                               data-value=\"").concat(row.uniqid, "\" \n                               class=\"ui button delete two-steps-delete popuped\" \n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"trash red icon\"></i>\n                            </a>\n                        </div>");
        }
      }],
      order: [[0, 'asc']],
      responsive: true,
      searching: false,
      paging: false,
      info: false,
      language: SemanticLocalization.dataTableLocalisation,
      drawCallback: function drawCallback() {
        console.log('DataTable drawCallback triggered'); // Debug log
        // Initialize Semantic UI elements

        conferenceTable.$conferencesTable.find('.popuped').popup(); // Double-click for editing

        conferenceTable.initializeDoubleClickEdit();
      }
    }); // Handle deletion using DeleteSomething.js
    // DeleteSomething.js automatically handles first click
    // We only listen for second click (when two-steps-delete class is removed)

    conferenceTable.$conferencesTable.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var roomId = $button.attr('data-value'); // Add loading indicator and disable button

      $button.addClass('loading disabled');
      ConferenceRoomsAPI.deleteRecord(roomId, conferenceTable.cbAfterDeleteRecord);
    });
  },

  /**
   * Callback after record deletion
   */
  cbAfterDeleteRecord: function cbAfterDeleteRecord(response) {
    if (response.result === true) {
      // Reload table
      conferenceTable.dataTable.ajax.reload(); // Update related components

      if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
        Extensions.cbOnDataChanged();
      }

      UserMessage.showSuccess(globalTranslate.cr_ConferenceRoomDeleted);
    } else {
      var _response$messages;

      UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || globalTranslate.cr_ImpossibleToDeleteConferenceRoom);
    } // Remove loading indicator and restore button to initial state


    $('a.delete').removeClass('loading disabled');
  },

  /**
   * Toggle empty table placeholder visibility
   */
  toggleEmptyPlaceholder: function toggleEmptyPlaceholder(isEmpty) {
    if (isEmpty) {
      $('#conference-table-container').hide();
      $('#add-new-button').hide();
      $('#empty-table-placeholder').show();
    } else {
      $('#empty-table-placeholder').hide();
      $('#add-new-button').show();
      $('#conference-table-container').show();
    }
  },

  /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
  initializeDoubleClickEdit: function initializeDoubleClickEdit() {
    conferenceTable.$conferencesTable.on('dblclick', 'tbody td:not(.action-buttons)', function () {
      var data = conferenceTable.dataTable.row(this).data();

      if (data && data.uniqid) {
        window.location = "".concat(globalRootUrl, "conference-rooms/modify/").concat(data.uniqid);
      }
    });
  }
};
/**
 *  Initialize on document ready
 */

$(document).ready(function () {
  conferenceTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Db25mZXJlbmNlUm9vbXMvY29uZmVyZW5jZS1yb29tcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJjb25mZXJlbmNlVGFibGUiLCIkY29uZmVyZW5jZXNUYWJsZSIsIiQiLCJkYXRhVGFibGUiLCJpbml0aWFsaXplIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJhamF4IiwidXJsIiwiQ29uZmVyZW5jZVJvb21zQVBJIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsImRhdGFTcmMiLCJqc29uIiwiY29uc29sZSIsImxvZyIsInJlc3VsdCIsImRhdGEiLCJsZW5ndGgiLCJjb2x1bW5zIiwicmVuZGVyIiwidHlwZSIsInJvdyIsImNsYXNzTmFtZSIsInJlc3BvbnNpdmVQcmlvcml0eSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJnbG9iYWxSb290VXJsIiwidW5pcWlkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwRGVsZXRlIiwib3JkZXIiLCJyZXNwb25zaXZlIiwic2VhcmNoaW5nIiwicGFnaW5nIiwiaW5mbyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJmaW5kIiwicG9wdXAiLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwicm9vbUlkIiwiYXR0ciIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInJlc3BvbnNlIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd1N1Y2Nlc3MiLCJjcl9Db25mZXJlbmNlUm9vbURlbGV0ZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwiY3JfSW1wb3NzaWJsZVRvRGVsZXRlQ29uZmVyZW5jZVJvb20iLCJyZW1vdmVDbGFzcyIsImlzRW1wdHkiLCJoaWRlIiwic2hvdyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyx5QkFBRCxDQURBO0FBRXBCQyxFQUFBQSxTQUFTLEVBQUUsRUFGUzs7QUFJcEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBUG9CLHdCQU9QO0FBQ1Q7QUFDQUosSUFBQUEsZUFBZSxDQUFDSyxzQkFBaEIsQ0FBdUMsSUFBdkM7QUFFQUwsSUFBQUEsZUFBZSxDQUFDTSxtQkFBaEI7QUFDSCxHQVptQjs7QUFjcEI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG1CQWpCb0IsaUNBaUJFO0FBQ2xCTixJQUFBQSxlQUFlLENBQUNHLFNBQWhCLEdBQTRCSCxlQUFlLENBQUNDLGlCQUFoQixDQUFrQ00sU0FBbEMsQ0FBNEM7QUFDcEVDLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxHQUFHLEVBQUVDLGtCQUFrQixDQUFDQyxTQUFuQixDQUE2QkMsT0FEaEM7QUFFRkMsUUFBQUEsT0FBTyxFQUFFLGlCQUFTQyxJQUFULEVBQWU7QUFDcEJDLFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGVBQVosRUFBNkJGLElBQTdCLEVBRG9CLENBQ2dCO0FBRXBDOztBQUNBZCxVQUFBQSxlQUFlLENBQUNLLHNCQUFoQixDQUNJLENBQUNTLElBQUksQ0FBQ0csTUFBTixJQUFnQixDQUFDSCxJQUFJLENBQUNJLElBQXRCLElBQThCSixJQUFJLENBQUNJLElBQUwsQ0FBVUMsTUFBVixLQUFxQixDQUR2RDtB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QkFBaEIsQ0FBa0M0QyxFQUFsQyxDQUFxQyxVQUFyQyxFQUFpRCwrQkFBakQsRUFBa0YsWUFBVztBQUN6RixVQUFNM0IsSUFBSSxHQUFHbEIsZUFBZSxDQUFDRyxTQUFoQixDQUEwQm9CLEdBQTFCLENBQThCLElBQTlCLEVBQW9DTCxJQUFwQyxFQUFiOztBQUNBLFVBQUlBLElBQUksSUFBSUEsSUFBSSxDQUFDVyxNQUFqQixFQUF5QjtBQUNyQndDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQjFDLGFBQXJCLHFDQUE2RFYsSUFBSSxDQUFDVyxNQUFsRTtBQUNIO0FBQ0osS0FMRDtBQU1IO0FBNUptQixDQUF4QjtBQStKQTtBQUNBO0FBQ0E7O0FBQ0EzQixDQUFDLENBQUNxRSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCeEUsRUFBQUEsZUFBZSxDQUFDSSxVQUFoQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgQ29uZmVyZW5jZVJvb21zQVBJLCBFeHRlbnNpb25zLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqINCc0L7QtNGD0LvRjCDRg9C/0YDQsNCy0LvQtdC90LjRjyDRgtCw0LHQu9C40YbQtdC5INC60L7QvdGE0LXRgNC10L3RhtC40LlcbiAqL1xuY29uc3QgY29uZmVyZW5jZVRhYmxlID0ge1xuICAgICRjb25mZXJlbmNlc1RhYmxlOiAkKCcjY29uZmVyZW5jZS1yb29tcy10YWJsZScpLFxuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBDb25mZXJlbmNlIHRhYmxlIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGx5IHNob3cgcGxhY2Vob2xkZXIgdW50aWwgZGF0YSBsb2Fkc1xuICAgICAgICBjb25mZXJlbmNlVGFibGUudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcih0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIGNvbmZlcmVuY2VUYWJsZS5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGNvbmZlcmVuY2VUYWJsZS5kYXRhVGFibGUgPSBjb25mZXJlbmNlVGFibGUuJGNvbmZlcmVuY2VzVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IENvbmZlcmVuY2VSb29tc0FQSS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBUEkgUmVzcG9uc2U6JywganNvbik7IC8vIERlYnVnIGxvZ1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFuYWdlIGVtcHR5IHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIGNvbmZlcmVuY2VUYWJsZS50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgIWpzb24ucmVzdWx0IHx8ICFqc29uLmRhdGEgfHwganNvbi5kYXRhLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ganNvbi5yZXN1bHQgPyBqc29uLmRhdGEgOiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ25hbWUnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Ryb25nPiR7ZGF0YX08L3N0cm9uZz5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjZW50ZXIgYWxpZ25lZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3BpbkNvZGUnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdjZW50ZXIgYWxpZ25lZCBoaWRlLW9uLW1vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNpdmVQcmlvcml0eTogMixcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAncmlnaHQgYWxpZ25lZCBhY3Rpb24tYnV0dG9ucycsIC8vIEFkZGVkIGNsYXNzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICByZXNwb25zaXZlUHJpb3JpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWNvbmZlcmVuY2Utcm9vbXMvbW9kaWZ5LyR7cm93LnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3Jvdy51bmlxaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidHJhc2ggcmVkIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1swLCAnYXNjJ11dLFxuICAgICAgICAgICAgcmVzcG9uc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGF0YVRhYmxlIGRyYXdDYWxsYmFjayB0cmlnZ2VyZWQnKTsgLy8gRGVidWcgbG9nXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBlbGVtZW50c1xuICAgICAgICAgICAgICAgIGNvbmZlcmVuY2VUYWJsZS4kY29uZmVyZW5jZXNUYWJsZS5maW5kKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICAgICAgICAgICAgY29uZmVyZW5jZVRhYmxlLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZGVsZXRpb24gdXNpbmcgRGVsZXRlU29tZXRoaW5nLmpzXG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2Ugb25seSBsaXN0ZW4gZm9yIHNlY29uZCBjbGljayAod2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWQpXG4gICAgICAgIGNvbmZlcmVuY2VUYWJsZS4kY29uZmVyZW5jZXNUYWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3Qgcm9vbUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIGluZGljYXRvciBhbmQgZGlzYWJsZSBidXR0b25cbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQ29uZmVyZW5jZVJvb21zQVBJLmRlbGV0ZVJlY29yZChyb29tSWQsIGNvbmZlcmVuY2VUYWJsZS5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZVxuICAgICAgICAgICAgY29uZmVyZW5jZVRhYmxlLmRhdGFUYWJsZS5hamF4LnJlbG9hZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1N1Y2Nlc3MoZ2xvYmFsVHJhbnNsYXRlLmNyX0NvbmZlcmVuY2VSb29tRGVsZXRlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8IFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcl9JbXBvc3NpYmxlVG9EZWxldGVDb25mZXJlbmNlUm9vbVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgaW5kaWNhdG9yIGFuZCByZXN0b3JlIGJ1dHRvbiB0byBpbml0aWFsIHN0YXRlXG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICAgICAgICAkKCcjY29uZmVyZW5jZS10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjY29uZmVyZW5jZS10YWJsZS1jb250YWluZXInKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAqIElNUE9SVEFOVDogRXhjbHVkZSBjZWxscyB3aXRoIGFjdGlvbi1idXR0b25zIGNsYXNzIHRvIGF2b2lkIGNvbmZsaWN0IHdpdGggZGVsZXRlLXNvbWV0aGluZy5qc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIGNvbmZlcmVuY2VUYWJsZS4kY29uZmVyZW5jZXNUYWJsZS5vbignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5hY3Rpb24tYnV0dG9ucyknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBjb25mZXJlbmNlVGFibGUuZGF0YVRhYmxlLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnVuaXFpZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9Y29uZmVyZW5jZS1yb29tcy9tb2RpZnkvJHtkYXRhLnVuaXFpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25mZXJlbmNlVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==