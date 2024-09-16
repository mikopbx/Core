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
   * The page length selector.
   * @type {jQuery}
   */
  $pageLengthSelector: $('#page-length-select'),

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
    }); // Reset datatable sorts and page

    $("a[href='/admin-cabinet/extensions/index/#reset-cache']").on('click', function (e) {
      e.preventDefault();
      extensionsIndex.$extensionsList.DataTable().state.clear();
      window.location.hash = '#reset-cache';
      window.location.reload();
    }); // Event listener to save the user's page length selection and update the table

    extensionsIndex.$pageLengthSelector.dropdown({
      onChange: function onChange(pageLength) {
        if (pageLength === 'auto') {
          pageLength = extensionsIndex.calculatePageLength();
          localStorage.removeItem('extensionsTablePageLength');
        } else {
          localStorage.setItem('extensionsTablePageLength', pageLength);
        }

        extensionsIndex.dataTable.page.len(pageLength).draw();
      }
    });
  },
  // Set up the DataTable on the extensions list.
  initializeDataTable: function initializeDataTable() {
    if (window.location.hash === "#reset-cache") {
      localStorage.removeItem('DataTables_extensions-table_/admin-cabinet/extensions/index/');
    } // Get the user's saved value or use the automatically calculated value if none exists


    var savedPageLength = localStorage.getItem('extensionsTablePageLength');
    var pageLength = savedPageLength ? savedPageLength : extensionsIndex.calculatePageLength();
    extensionsIndex.$extensionsList.DataTable({
      // Enable state saving to automatically save and restore the table's state
      stateSave: true,
      columnDefs: [{
        defaultContent: "-",
        targets: "_all"
      }, {
        responsivePriority: 1,
        targets: 0
      }, {
        responsivePriority: 1,
        targets: 1
      }, {
        responsivePriority: 3,
        targets: 2
      }, {
        responsivePriority: 4,
        targets: 3
      }, {
        responsivePriority: 5,
        targets: 4
      }, {
        responsivePriority: 1,
        targets: -1
      }],
      responsive: {
        details: false
      },
      columns: [{
        name: 'status',
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable,

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
      pageLength: pageLength,
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

        $(row).attr('data-value', data.number);
        $.each($('td', $templateRow), function (index, value) {
          $('td', row).eq(index).html($(value).html()).addClass($(value).attr('class'));
        });
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
    }); // Set the select input value to the saved value if it exists

    if (savedPageLength) {
      extensionsIndex.$pageLengthSelector.dropdown('set value', savedPageLength);
    }

    extensionsIndex.dataTable = extensionsIndex.$extensionsList.DataTable(); // Initialize debounce timer variable

    var searchDebounceTimer = null;
    extensionsIndex.$globalSearch.on('keyup', function (e) {
      // Clear previous timer if the user is still typing
      clearTimeout(searchDebounceTimer); // Set a new timer for delayed execution

      searchDebounceTimer = setTimeout(function () {
        var text = extensionsIndex.$globalSearch.val(); // Trigger the search if input is valid (Enter, Backspace, or more than 2 characters)

        if (e.keyCode === 13 || e.keyCode === 8 || text.length >= 2) {
          extensionsIndex.applyFilter(text);
        }
      }, 500); // 500ms delay before executing the search
    });
    extensionsIndex.dataTable.on('draw', function () {
      extensionsIndex.$globalSearch.closest('div').removeClass('loading');
    });
  },
  calculatePageLength: function calculatePageLength() {
    // Calculate row height
    var rowHeight = extensionsIndex.$extensionsList.find('tr').first().outerHeight(); // Calculate window height and available space for table

    var windowHeight = window.innerHeight;
    var headerFooterHeight = 400; // Estimate height for header, footer, and other elements
    // Calculate new page length

    return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 5);
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
      extensionsIndex.copyToClipboard(response.data.secret);
      $clipboardButton.popup('show');
      setTimeout(function () {
        $clipboardButton.popup('hide');
      }, 1500);
    } else {
      // Show an error message if get secret was not successful.
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
  },

  /**
   * Copies the text passed as param to the system clipboard
   * Check if using HTTPS and navigator.clipboard is available
   * Then uses standard clipboard API, otherwise uses fallback
   */
  copyToClipboard: function copyToClipboard(content) {
    if (window.isSecureContext && navigator.clipboard) {
      navigator.clipboard.writeText(content);
    } else {
      extensionsIndex.unsecuredCopyToClipboard(content);
    }
  },

  /**
   * Put text variable into clipboard for unsecured connection.
   * @param {string} content - The text value.
   */
  unsecuredCopyToClipboard: function unsecuredCopyToClipboard(content) {
    var textArea = document.createElement("textarea");
    textArea.value = content;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Unable to copy to clipboard', err);
    }

    document.body.removeChild(textArea);
  }
};
/**
 *  Initialize Employees table on document ready
 */

$(document).ready(function () {
  extensionsIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCJkYXRhVGFibGUiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJleHRlbnNpb25JZCIsInJlbW92ZSIsIlBieEFwaSIsIkV4dGVuc2lvbnNEZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwic2Nyb2xsQ29sbGFwc2UiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsIiR0ZW1wbGF0ZVJvdyIsImNsb25lIiwiJGF2YXRhciIsImZpbmQiLCJhdmF0YXIiLCJhZnRlciIsInVzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsImVtYWlsIiwiJGVkaXRCdXR0b24iLCJ1bmRlZmluZWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiaW5kZXgiLCJ2YWx1ZSIsImVxIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsImluaXRpYWxpemVJbnB1dG1hc2siLCJwb3B1cCIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwidmFsIiwia2V5Q29kZSIsImxlbmd0aCIsImFwcGx5RmlsdGVyIiwicmVtb3ZlQ2xhc3MiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJyZXNwb25zZSIsInJlc3VsdCIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVFeHRlbnNpb24iLCJjb3B5VG9DbGlwYm9hcmQiLCJzZWNyZXQiLCJleF9JbXBvc3NpYmxlVG9HZXRTZWNyZXQiLCIkZWwiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJpbnB1dG1hc2siLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5IiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJzZWFyY2giLCJjb250ZW50IiwiaXNTZWN1cmVDb250ZXh0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkIiwidGV4dEFyZWEiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJmb2N1cyIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwiY29uc29sZSIsInJlbW92ZUNoaWxkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUUsSUFEVTs7QUFHcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFQyxDQUFDLENBQUMsbUJBQUQsQ0FQRTs7QUFTcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FiSTs7QUFlcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsbUJBQW1CLEVBQUNGLENBQUMsQ0FBQyxxQkFBRCxDQW5CRDs7QUFxQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRSxFQXpCUzs7QUEyQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEtBQUssRUFBRUosQ0FBQyxDQUFDLE1BQUQsQ0EvQlk7O0FBa0NwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxVQXRDb0Isd0JBc0NQO0FBRVQ7QUFDQUwsSUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTSxJQUFiLENBQWtCLFlBQVk7QUFDMUIsVUFBSU4sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxJQUFSLENBQWEsS0FBYixNQUF3QixFQUE1QixFQUFnQztBQUM1QlAsUUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxJQUFSLENBQWEsS0FBYixZ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VCxHQUFlaUQsT0FBZjtBQUNBTyxJQUFBQSxRQUFRLENBQUNFLElBQVQsQ0FBY0MsV0FBZCxDQUEwQkosUUFBMUI7QUFDQUEsSUFBQUEsUUFBUSxDQUFDSyxLQUFUO0FBQWlCTCxJQUFBQSxRQUFRLENBQUNNLE1BQVQ7O0FBQ2pCLFFBQUc7QUFDQ0wsTUFBQUEsUUFBUSxDQUFDTSxXQUFULENBQXFCLE1BQXJCO0FBQ0gsS0FGRCxDQUVFLE9BQU1DLEdBQU4sRUFBVztBQUNUQyxNQUFBQSxPQUFPLENBQUNsQyxLQUFSLENBQWMsNkJBQWQsRUFBNkNpQyxHQUE3QztBQUNIOztBQUNEUCxJQUFBQSxRQUFRLENBQUNFLElBQVQsQ0FBY08sV0FBZCxDQUEwQlYsUUFBMUI7QUFDSDtBQTFXbUIsQ0FBeEI7QUE2V0E7QUFDQTtBQUNBOztBQUNBOUksQ0FBQyxDQUFDK0ksUUFBRCxDQUFELENBQVlVLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVKLEVBQUFBLGVBQWUsQ0FBQ1EsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2sgKi9cblxuXG4vKipcbiAqIFRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlIGhhbmRsZXMgdGhlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBleHRlbnNpb25zIGluZGV4IHBhZ2UuXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25zSW5kZXhcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0luZGV4ID0ge1xuICAgIG1hc2tMaXN0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zTGlzdDogJCgnI2V4dGVuc2lvbnMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYm9keTogJCgnYm9keScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlLlxuICAgICAqIFNldHMgdXAgbmVjZXNzYXJ5IGludGVyYWN0aXZpdHkgYW5kIGZlYXR1cmVzIG9uIHRoZSBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGF2YXRhcnMgd2l0aCBtaXNzaW5nIHNyY1xuICAgICAgICAkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdi5cbiAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblxuICAgICAgICAvLyBTZXQgdXAgZG91YmxlLWNsaWNrIGJlaGF2aW9yIG9uIHRoZSBleHRlbnNpb24gcm93cy5cbiAgICAgICAgJCgnLmV4dGVuc2lvbi1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBmdW5jdGlvbmFsaXR5IG9uIGRlbGV0ZSBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIFBieEFwaSBtZXRob2QgdG8gZGVsZXRlIHRoZSBleHRlbnNpb24gcmVjb3JkLlxuICAgICAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNEZWxldGVSZWNvcmQoZXh0ZW5zaW9uSWQsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGNvcHkgc2VjcmV0IGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmNsaXBib2FyZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBnZXQgdGhlIGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U2VjcmV0KG51bWJlciwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJHZXRTZWNyZXQpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc2V0IGRhdGF0YWJsZSBzb3J0cyBhbmQgcGFnZVxuICAgICAgICAkKFwiYVtocmVmPScvYWRtaW4tY2FiaW5ldC9leHRlbnNpb25zL2luZGV4LyNyZXNldC1jYWNoZSddXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKS5zdGF0ZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyNyZXNldC1jYWNoZSc7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aD09PSdhdXRvJyl7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpe1xuXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gXCIjcmVzZXQtY2FjaGVcIikge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ0RhdGFUYWJsZXNfZXh0ZW5zaW9ucy10YWJsZV8vYWRtaW4tY2FiaW5ldC9leHRlbnNpb25zL2luZGV4LycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoe1xuICAgICAgICAgICAgLy8gRW5hYmxlIHN0YXRlIHNhdmluZyB0byBhdXRvbWF0aWNhbGx5IHNhdmUgYW5kIHJlc3RvcmUgdGhlIHRhYmxlJ3Mgc3RhdGVcbiAgICAgICAgICAgIHN0YXRlU2F2ZTogdHJ1ZSxcblxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAxfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMywgIHRhcmdldHM6IDJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA0LCAgdGFyZ2V0czogM30sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDUsICB0YXJnZXRzOiA0fSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IC0xfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XG4gICAgICAgICAgICAgICAgZGV0YWlsczogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnVXNlcnMudXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZW5zaW9ucy5udW1iZXIgQVMgSU5URUdFUiknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZXJuYWxFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy5lbWFpbCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiB0cnVlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldE5ld1JlY29yZHNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHNjcm9sbGVyOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgRXh0ZW5zaW9ucyByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZW1wbGF0ZVJvdyAgPSAgJCgnLmV4dGVuc2lvbi1yb3ctdHBsJykuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGF2YXRhciA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYXZhdGFyJyk7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hdHRyKCdzcmMnLGRhdGEuYXZhdGFyKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmFmdGVyKGRhdGEudXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubnVtYmVyJykudGV4dChkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5tb2JpbGUgaW5wdXQnKS5hdHRyKCd2YWx1ZScsIGRhdGEubW9iaWxlKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmVtYWlsJykudGV4dChkYXRhLmVtYWlsKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0ICRlZGl0QnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmVkaXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVkaXRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkZWRpdEJ1dHRvbi5hdHRyKCdocmVmJyxgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YS5pZH1gKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRjbGlwYm9hcmRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnLGRhdGEubnVtYmVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkLmVhY2goJCgndGQnLCAkdGVtcGxhdGVSb3cpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcShpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKCQodmFsdWUpLmh0bWwoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygkKHZhbHVlKS5hdHRyKCdjbGFzcycpKVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIGZvciBtb2JpbGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJyxzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZSA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZGVsZXRpbmcgYSByZWNvcmQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVsZXRlZCBleHRlbnNpb24ncyB0YWJsZSByb3cuXG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYHRyW2lkPSR7cmVzcG9uc2UuZGF0YS5pZH1dYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UuXG4gICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgY2V0IGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckdldFNlY3JldChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYGEuY2xpcGJvYXJkW2RhdGEtdmFsdWU9JHtyZXNwb25zZS5kYXRhLm51bWJlcn1dYCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguY29weVRvQ2xpcGJvYXJkKHJlc3BvbnNlLmRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGdldCBzZWNyZXQgd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSB0ZXh0IHBhc3NlZCBhcyBwYXJhbSB0byB0aGUgc3lzdGVtIGNsaXBib2FyZFxuICAgICAqIENoZWNrIGlmIHVzaW5nIEhUVFBTIGFuZCBuYXZpZ2F0b3IuY2xpcGJvYXJkIGlzIGF2YWlsYWJsZVxuICAgICAqIFRoZW4gdXNlcyBzdGFuZGFyZCBjbGlwYm9hcmQgQVBJLCBvdGhlcndpc2UgdXNlcyBmYWxsYmFja1xuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGlmICh3aW5kb3cuaXNTZWN1cmVDb250ZXh0ICYmIG5hdmlnYXRvci5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogUHV0IHRleHQgdmFyaWFibGUgaW50byBjbGlwYm9hcmQgZm9yIHVuc2VjdXJlZCBjb25uZWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gVGhlIHRleHQgdmFsdWUuXG4gICAgICovXG4gICAgdW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHRleHRBcmVhLnZhbHVlPWNvbnRlbnQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB0ZXh0QXJlYS5mb2N1cygpO3RleHRBcmVhLnNlbGVjdCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29weSB0byBjbGlwYm9hcmQnLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZXMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19