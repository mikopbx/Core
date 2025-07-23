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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Db25mZXJlbmNlUm9vbXMvY29uZmVyZW5jZS1yb29tcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJjb25mZXJlbmNlVGFibGUiLCIkY29uZmVyZW5jZXNUYWJsZSIsIiQiLCJkYXRhVGFibGUiLCJpbml0aWFsaXplIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJhamF4IiwidXJsIiwiQ29uZmVyZW5jZVJvb21zQVBJIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsImRhdGFTcmMiLCJqc29uIiwicmVzdWx0IiwiZGF0YSIsImxlbmd0aCIsImNvbHVtbnMiLCJyZW5kZXIiLCJ0eXBlIiwicm93IiwiY2xhc3NOYW1lIiwicmVzcG9uc2l2ZVByaW9yaXR5Iiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImdsb2JhbFJvb3RVcmwiLCJ1bmlxaWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJvcmRlciIsInJlc3BvbnNpdmUiLCJzZWFyY2hpbmciLCJwYWdpbmciLCJpbmZvIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImNvbnNvbGUiLCJsb2ciLCJmaW5kIiwicG9wdXAiLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwicm9vbUlkIiwiYXR0ciIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInJlc3BvbnNlIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd1N1Y2Nlc3MiLCJjcl9Db25mZXJlbmNlUm9vbURlbGV0ZWQiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwiY3JfSW1wb3NzaWJsZVRvRGVsZXRlQ29uZmVyZW5jZVJvb20iLCJyZW1vdmVDbGFzcyIsImlzRW1wdHkiLCJoaWRlIiwic2hvdyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyx5QkFBRCxDQURBO0FBRXBCQyxFQUFBQSxTQUFTLEVBQUUsRUFGUzs7QUFJcEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBUG9CLHdCQU9QO0FBQ1Q7QUFDQUosSUFBQUEsZUFBZSxDQUFDSyxzQkFBaEIsQ0FBdUMsSUFBdkM7QUFFQUwsSUFBQUEsZUFBZSxDQUFDTSxtQkFBaEI7QUFDSCxHQVptQjs7QUFjcEI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG1CQWpCb0IsaUNBaUJFO0FBQ2xCTixJQUFBQSxlQUFlLENBQUNHLFNBQWhCLEdBQTRCSCxlQUFlLENBQUNDLGlCQUFoQixDQUFrQ00sU0FBbEMsQ0FBNEM7QUFDcEVDLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxHQUFHLEVBQUVDLGtCQUFrQixDQUFDQyxTQUFuQixDQUE2QkMsT0FEaEM7QUFFRkMsUUFBQUEsT0FBTyxFQUFFLGlCQUFTQyxJQUFULEVBQWU7QUFDcEI7QUFDQWQsVUFBQUEsZUFBZSxDQUFDSyxzQkFBaEIsQ0FDSSxDQUFDUyxJQUFJLENBQUNDLE1BQU4sSUFBZ0IsQ0FBQ0QsSUFBSSxDQUFDRSxJQUF0QixJQUE4QkYsSUFBSSxDQUFDRSxJQUFMLENBQVVDLE1BQVYsS0FBcUIsQ0FEdkQ7QUFHQSxpQkFBT0gsSUFBSSxDQUFDQyxNQUFMLEdBQWNELElBQUksQ0FBQ0UsSUFBbkIsR0FBMEIsRUFBakM7QUFD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QixJQUFJLEdBQUdoQixlQUFlLENBQUNHLFNBQWhCLENBQTBCa0IsR0FBMUIsQ0FBOEIsSUFBOUIsRUFBb0NMLElBQXBDLEVBQWI7O0FBQ0EsVUFBSUEsSUFBSSxJQUFJQSxJQUFJLENBQUNXLE1BQWpCLEVBQXlCO0FBQ3JCMEMsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCNUMsYUFBckIscUNBQTZEVixJQUFJLENBQUNXLE1BQWxFO0FBQ0g7QUFDSixLQUxEO0FBTUg7QUExSm1CLENBQXhCO0FBNkpBO0FBQ0E7QUFDQTs7QUFDQXpCLENBQUMsQ0FBQ3FFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4RSxFQUFBQSxlQUFlLENBQUNJLFVBQWhCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBDb25mZXJlbmNlUm9vbXNBUEksIEV4dGVuc2lvbnMsIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICog0JzQvtC00YPQu9GMINGD0L/RgNCw0LLQu9C10L3QuNGPINGC0LDQsdC70LjRhtC10Lkg0LrQvtC90YTQtdGA0LXQvdGG0LjQuVxuICovXG5jb25zdCBjb25mZXJlbmNlVGFibGUgPSB7XG4gICAgJGNvbmZlcmVuY2VzVGFibGU6ICQoJyNjb25mZXJlbmNlLXJvb21zLXRhYmxlJyksXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIENvbmZlcmVuY2UgdGFibGUgbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsbHkgc2hvdyBwbGFjZWhvbGRlciB1bnRpbCBkYXRhIGxvYWRzXG4gICAgICAgIGNvbmZlcmVuY2VUYWJsZS50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgY29uZmVyZW5jZVRhYmxlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgY29uZmVyZW5jZVRhYmxlLmRhdGFUYWJsZSA9IGNvbmZlcmVuY2VUYWJsZS4kY29uZmVyZW5jZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogQ29uZmVyZW5jZVJvb21zQVBJLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IGZ1bmN0aW9uKGpzb24pIHsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNYW5hZ2UgZW1wdHkgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgY29uZmVyZW5jZVRhYmxlLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAhanNvbi5yZXN1bHQgfHwgIWpzb24uZGF0YSB8fCBqc29uLmRhdGEubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqc29uLnJlc3VsdCA/IGpzb24uZGF0YSA6IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnbmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NlbnRlciBhbGlnbmVkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAncGluQ29kZScsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2NlbnRlciBhbGlnbmVkIGhpZGUtb24tbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2l2ZVByaW9yaXR5OiAyLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGFjdGlvbi1idXR0b25zJywgLy8gQWRkZWQgY2xhc3MgZm9yIGlkZW50aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNpdmVQcmlvcml0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9Y29uZmVyZW5jZS1yb29tcy9tb2RpZnkvJHtyb3cudW5pcWlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cm93LnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCByZWQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbWzAsICdhc2MnXV0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB0cnVlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEYXRhVGFibGUgZHJhd0NhbGxiYWNrIHRyaWdnZXJlZCcpOyAvLyBEZWJ1ZyBsb2dcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgY29uZmVyZW5jZVRhYmxlLiRjb25mZXJlbmNlc1RhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgICAgICAgICAgICBjb25mZXJlbmNlVGFibGUuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkZWxldGlvbiB1c2luZyBEZWxldGVTb21ldGhpbmcuanNcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGF1dG9tYXRpY2FsbHkgaGFuZGxlcyBmaXJzdCBjbGlja1xuICAgICAgICAvLyBXZSBvbmx5IGxpc3RlbiBmb3Igc2Vjb25kIGNsaWNrICh3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZClcbiAgICAgICAgY29uZmVyZW5jZVRhYmxlLiRjb25mZXJlbmNlc1RhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCByb29tSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgaW5kaWNhdG9yIGFuZCBkaXNhYmxlIGJ1dHRvblxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBDb25mZXJlbmNlUm9vbXNBUEkuZGVsZXRlUmVjb3JkKHJvb21JZCwgY29uZmVyZW5jZVRhYmxlLmNiQWZ0ZXJEZWxldGVSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlXG4gICAgICAgICAgICBjb25mZXJlbmNlVGFibGUuZGF0YVRhYmxlLmFqYXgucmVsb2FkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93U3VjY2VzcyhnbG9iYWxUcmFuc2xhdGUuY3JfQ29uZmVyZW5jZVJvb21EZWxldGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNyX0ltcG9zc2libGVUb0RlbGV0ZUNvbmZlcmVuY2VSb29tXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBpbmRpY2F0b3IgYW5kIHJlc3RvcmUgYnV0dG9uIHRvIGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtcHR5IHRhYmxlIHBsYWNlaG9sZGVyIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB0b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpIHtcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICQoJyNjb25mZXJlbmNlLXRhYmxlLWNvbnRhaW5lcicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNjb25mZXJlbmNlLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gIC8qKlxuICAgICAqIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICogSU1QT1JUQU5UOiBFeGNsdWRlIGNlbGxzIHdpdGggYWN0aW9uLWJ1dHRvbnMgY2xhc3MgdG8gYXZvaWQgY29uZmxpY3Qgd2l0aCBkZWxldGUtc29tZXRoaW5nLmpzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpIHtcbiAgICAgICAgY29uZmVyZW5jZVRhYmxlLiRjb25mZXJlbmNlc1RhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLmFjdGlvbi1idXR0b25zKScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGNvbmZlcmVuY2VUYWJsZS5kYXRhVGFibGUucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1jb25mZXJlbmNlLXJvb21zL21vZGlmeS8ke2RhdGEudW5pcWlkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbmZlcmVuY2VUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19