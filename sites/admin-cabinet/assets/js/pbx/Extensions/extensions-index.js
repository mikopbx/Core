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

/* global globalRootUrl, SipAPI, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate, Inputmask */

/**
 * The ExtensionsIndex module handles the functionality for the extensions index page.
 *
 * @module extensionsIndex
 */
var extensionsIndex = {
  maskList: null,

  /**
   * The extensions table element.
   * @type {jQuery}
   */
  $extensionsList: $('#extensions-table'),

  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: $('#global-search'),

  /**
   * The data table object.
   * @type {Object}
   */
  dataTable: {},

  /**
   * The document body.
   * @type {jQuery}
   */
  $body: $('body'),

  /**
   * Initialize the ExtensionsIndex module.
   * Sets up necessary interactivity and features on the page.
   */
  initialize: function initialize() {
    // Handle avatars with missing src
    $('.avatar').each(function () {
      if ($(this).attr('src') === '') {
        $(this).attr('src', "".concat(globalRootUrl, "assets/img/unknownPerson.jpg"));
      }
    }); // Set up the DataTable on the extensions list.

    extensionsIndex.initializeDataTable(); // Move the "Add New" button to the first eight-column div.

    $('#add-new-button').appendTo($('div.eight.column:eq(0)')); // Set up double-click behavior on the extension rows.

    $('.extension-row td').on('dblclick', function (e) {
      var id = $(e.target).closest('tr').attr('id');
      window.location = "".concat(globalRootUrl, "extensions/modify/").concat(id);
    }); // Set up delete functionality on delete button click.

    extensionsIndex.$body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      $(e.target).addClass('disabled'); // Get the extension ID from the closest table row.

      var extensionId = $(e.target).closest('tr').attr('id'); // Remove any previous AJAX messages.

      $('.message.ajax').remove(); // Call the PbxApi method to delete the extension record.

      PbxApi.ExtensionsDeleteRecord(extensionId, extensionsIndex.cbAfterDeleteRecord);
    }); // Set up copy secret button click.

    extensionsIndex.$body.on('click', 'a.clipboard', function (e) {
      e.preventDefault();
      $(e.target).closest('div.button').addClass('disabled'); // Get the number from the closest table row.

      var number = $(e.target).closest('tr').attr('data-value'); // Remove any previous AJAX messages.

      $('.message.ajax').remove(); // Call the PbxApi method to get the extension secret.

      SipAPI.getSecret(number, extensionsIndex.cbAfterGetSecret);
    });
  },
  // Set up the DataTable on the extensions list.
  initializeDataTable: function initializeDataTable() {
    extensionsIndex.$extensionsList.DataTable({
      search: {
        search: "".concat(extensionsIndex.$globalSearch.val())
      },
      columnDefs: [{
        "defaultContent": "-",
        "targets": "_all"
      }],
      columns: [{
        name: 'status',
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable

      }, {
        name: 'username',
        data: 'Users.username'
      }, {
        name: 'number',
        data: 'CAST(Extensions.number AS INTEGER)'
      }, {
        name: 'mobile',
        data: 'CAST(ExternalExtensions.number AS INTEGER)'
      }, {
        name: 'email',
        data: 'Users.email'
      }, {
        name: 'buttons',
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable

      }],
      order: [[1, 'asc']],
      serverSide: true,
      processing: true,
      ajax: {
        url: "".concat(globalRootUrl, "extensions/getNewRecords"),
        type: 'POST'
      },
      paging: true,
      // stateSave: true,
      sDom: 'rtip',
      deferRender: true,
      pageLength: 16,
      scrollCollapse: true,
      // scroller: true,
      language: SemanticLocalization.dataTableLocalisation,

      /**
       * Constructs the Extensions row.
       * @param {HTMLElement} row - The row element.
       * @param {Array} data - The row data.
       */
      createdRow: function createdRow(row, data) {
        var $templateRow = $('.extension-row-tpl').clone(true);
        var $avatar = $templateRow.find('.avatar');
        $avatar.attr('src', data.avatar);
        $avatar.after(data.username);
        $templateRow.find('.number').text(data.number);
        $templateRow.find('.mobile input').attr('value', data.mobile);
        $templateRow.find('.email').text(data.email);
        var $editButton = $templateRow.find('.action-buttons .button.edit');

        if ($editButton !== undefined) {
          $editButton.attr('href', "".concat(globalRootUrl, "extensions/modify/").concat(data.id));
        }

        var $clipboardButton = $templateRow.find('.action-buttons .button.clipboard');

        if ($clipboardButton !== undefined) {
          $clipboardButton.attr('data-value', data.number);
        }

        $(row).attr('data-value', data.number).html($templateRow.html());
      },

      /**
       * Draw event - fired once the table has completed a draw.
       */
      drawCallback: function drawCallback() {
        // Initialize the input mask for mobile numbers.
        extensionsIndex.initializeInputmask($('input.mobile-number-input')); // Set up popups.

        $('.clipboard').popup({
          on: 'manual'
        });
      }
    });
    extensionsIndex.dataTable = extensionsIndex.$extensionsList.DataTable();
    extensionsIndex.$globalSearch.on('keyup', function (e) {
      if (e.keyCode === 13 || e.keyCode === 8 || extensionsIndex.$globalSearch.val().length > 2) {
        var text = extensionsIndex.$globalSearch.val();
        extensionsIndex.applyFilter(text);
      }
    });
    extensionsIndex.dataTable.on('draw', function () {
      extensionsIndex.$globalSearch.closest('div').removeClass('loading');
    });
  },

  /**
   * Callback function executed after deleting a record.
   * @param {Object} response - The response object from the API.
   */
  cbAfterDeleteRecord: function cbAfterDeleteRecord(response) {
    if (response.result === true) {
      // Remove the deleted extension's table row.
      extensionsIndex.$extensionsList.find("tr[id=".concat(response.data.id, "]")).remove(); // Call the callback function for data change.

      Extensions.cbOnDataChanged();
    } else {
      // Show an error message if deletion was not successful.
      UserMessage.showError(response.messages.error, globalTranslate.ex_ImpossibleToDeleteExtension);
    }

    $('a.delete').removeClass('disabled');
  },

  /**
   * Callback function executed after cet extension secret.
   * @param {Object} response - The response object from the API.
   */
  cbAfterGetSecret: function cbAfterGetSecret(response) {
    if (response.result === true) {
      var $clipboardButton = extensionsIndex.$extensionsList.find("a.clipboard[data-value=".concat(response.data.number, "]"));
      navigator.clipboard.writeText(response.data.secret);
      $clipboardButton.popup('show');
      setTimeout(function () {
        $clipboardButton.popup('hide');
      }, 1500);
    } else {
      // Show an error message if deletion was not successful.
      UserMessage.showError(response.messages.error, globalTranslate.ex_ImpossibleToGetSecret);
    }

    $('a.clipboard').removeClass('disabled');
  },

  /**
   * Initializes input masks for visualizing formatted numbers.
   * @param {Object} $el - The jQuery object for the element to initialize the input mask on.
   */
  initializeInputmask: function initializeInputmask($el) {
    if (extensionsIndex.maskList === null) {
      // Prepares the table for sort
      extensionsIndex.maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
    }

    $el.inputmasks({
      inputmask: {
        definitions: {
          '#': {
            validator: '[0-9]',
            cardinality: 1
          }
        }
      },
      match: /[0-9]/,
      replace: '9',
      list: extensionsIndex.maskList,
      listKey: 'mask'
    });
  },

  /**
   * Applies the filter to the data table.
   * @param {string} text - The filter text.
   */
  applyFilter: function applyFilter(text) {
    extensionsIndex.dataTable.search(text).draw();
    extensionsIndex.$globalSearch.closest('div').addClass('loading');
  }
};
/**
 *  Initialize Employees table on document ready
 */

$(document).ready(function () {
  extensionsIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsImRhdGFUYWJsZSIsIiRib2R5IiwiaW5pdGlhbGl6ZSIsImVhY2giLCJhdHRyIiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVEYXRhVGFibGUiLCJhcHBlbmRUbyIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsImV4dGVuc2lvbklkIiwicmVtb3ZlIiwiUGJ4QXBpIiwiRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJudW1iZXIiLCJTaXBBUEkiLCJnZXRTZWNyZXQiLCJjYkFmdGVyR2V0U2VjcmV0IiwiRGF0YVRhYmxlIiwic2VhcmNoIiwidmFsIiwiY29sdW1uRGVmcyIsImNvbHVtbnMiLCJuYW1lIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImRhdGEiLCJvcmRlciIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiYWpheCIsInVybCIsInR5cGUiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJwYWdlTGVuZ3RoIiwic2Nyb2xsQ29sbGFwc2UiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsIiR0ZW1wbGF0ZVJvdyIsImNsb25lIiwiJGF2YXRhciIsImZpbmQiLCJhdmF0YXIiLCJhZnRlciIsInVzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsImVtYWlsIiwiJGVkaXRCdXR0b24iLCJ1bmRlZmluZWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsImluaXRpYWxpemVJbnB1dG1hc2siLCJwb3B1cCIsImtleUNvZGUiLCJsZW5ndGgiLCJhcHBseUZpbHRlciIsInJlbW92ZUNsYXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0Iiwic2VjcmV0Iiwic2V0VGltZW91dCIsImV4X0ltcG9zc2libGVUb0dldFNlY3JldCIsIiRlbCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImRyYXciLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsUUFBUSxFQUFFLElBRFU7O0FBR3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRUMsQ0FBQyxDQUFDLG1CQUFELENBUEU7O0FBU3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBYkk7O0FBZXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFNBQVMsRUFBRSxFQW5CUzs7QUFxQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEtBQUssRUFBRUgsQ0FBQyxDQUFDLE1BQUQsQ0F6Qlk7O0FBNEJwQjtB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QjtBQUNKO0FBQ0E7QUFDQTtBQUNJN0IsRUFBQUEsV0FoUW9CLHVCQWdRUlosSUFoUVEsRUFnUUY7QUFDZC9ELElBQUFBLGVBQWUsQ0FBQ0ssU0FBaEIsQ0FBMEIyQixNQUExQixDQUFpQytCLElBQWpDLEVBQXVDMEMsSUFBdkM7QUFDQXpHLElBQUFBLGVBQWUsQ0FBQ0ksYUFBaEIsQ0FBOEJhLE9BQTlCLENBQXNDLEtBQXRDLEVBQTZDSSxRQUE3QyxDQUFzRCxTQUF0RDtBQUNIO0FBblFtQixDQUF4QjtBQXNRQTtBQUNBO0FBQ0E7O0FBQ0FsQixDQUFDLENBQUN1RyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCM0csRUFBQUEsZUFBZSxDQUFDTyxVQUFoQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2lwQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgSW5wdXRNYXNrUGF0dGVybnMsIFVzZXJNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUsIElucHV0bWFzayAqL1xuXG5cbi8qKlxuICogVGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUgaGFuZGxlcyB0aGUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGV4dGVuc2lvbnMgaW5kZXggcGFnZS5cbiAqXG4gKiBAbW9kdWxlIGV4dGVuc2lvbnNJbmRleFxuICovXG5jb25zdCBleHRlbnNpb25zSW5kZXggPSB7XG4gICAgbWFza0xpc3Q6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZXh0ZW5zaW9ucyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNMaXN0OiAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWwtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYm9keTogJCgnYm9keScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlLlxuICAgICAqIFNldHMgdXAgbmVjZXNzYXJ5IGludGVyYWN0aXZpdHkgYW5kIGZlYXR1cmVzIG9uIHRoZSBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGF2YXRhcnMgd2l0aCBtaXNzaW5nIHNyY1xuICAgICAgICAkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdi5cbiAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblxuICAgICAgICAvLyBTZXQgdXAgZG91YmxlLWNsaWNrIGJlaGF2aW9yIG9uIHRoZSBleHRlbnNpb24gcm93cy5cbiAgICAgICAgJCgnLmV4dGVuc2lvbi1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBmdW5jdGlvbmFsaXR5IG9uIGRlbGV0ZSBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIFBieEFwaSBtZXRob2QgdG8gZGVsZXRlIHRoZSBleHRlbnNpb24gcmVjb3JkLlxuICAgICAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNEZWxldGVSZWNvcmQoZXh0ZW5zaW9uSWQsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGNvcHkgc2VjcmV0IGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmNsaXBib2FyZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBnZXQgdGhlIGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U2VjcmV0KG51bWJlciwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJHZXRTZWNyZXQpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBzZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBzZWFyY2g6IGAke2V4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpfWAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uRGVmczogW3tcbiAgICAgICAgICAgICAgICBcImRlZmF1bHRDb250ZW50XCI6IFwiLVwiLFxuICAgICAgICAgICAgICAgIFwidGFyZ2V0c1wiOiBcIl9hbGxcIlxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy51c2VybmFtZSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdDQVNUKEV4dGVuc2lvbnMubnVtYmVyIEFTIElOVEVHRVIpJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZXJuYWxFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ1VzZXJzLmVtYWlsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnYnV0dG9ucycsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldE5ld1JlY29yZHNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IDE2LFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcGxhdGVSb3cgID0gICQoJy5leHRlbnNpb24tcm93LXRwbCcpLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhdmF0YXIgPSAkdGVtcGxhdGVSb3cuZmluZCgnLmF2YXRhcicpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYXR0cignc3JjJyxkYXRhLmF2YXRhcik7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hZnRlcihkYXRhLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm51bWJlcicpLnRleHQoZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubW9iaWxlIGlucHV0JykuYXR0cigndmFsdWUnLCBkYXRhLm1vYmlsZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5lbWFpbCcpLnRleHQoZGF0YS5lbWFpbCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkZWRpdEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5lZGl0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCRlZGl0QnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGVkaXRCdXR0b24uYXR0cignaHJlZicsYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGEuaWR9YClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkY2xpcGJvYXJkQnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyxkYXRhLm51bWJlcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtdmFsdWUnLCBkYXRhLm51bWJlcikuaHRtbCgkdGVtcGxhdGVSb3cuaHRtbCgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBmb3IgbW9iaWxlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVJbnB1dG1hc2soJCgnaW5wdXQubW9iaWxlLW51bWJlci1pbnB1dCcpKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcG9wdXBzLlxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTNcbiAgICAgICAgICAgICAgICB8fCBlLmtleUNvZGUgPT09IDhcbiAgICAgICAgICAgICAgICB8fCBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoKS5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBkZWxldGluZyBhIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWxldGVkIGV4dGVuc2lvbidzIHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgdHJbaWQ9JHtyZXNwb25zZS5kYXRhLmlkfV1gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBkYXRhIGNoYW5nZS5cbiAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZGVsZXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBjZXQgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0U2VjcmV0KHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgYS5jbGlwYm9hcmRbZGF0YS12YWx1ZT0ke3Jlc3BvbnNlLmRhdGEubnVtYmVyfV1gKTtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHJlc3BvbnNlLmRhdGEuc2VjcmV0KVxuICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZGVsZXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZXMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19