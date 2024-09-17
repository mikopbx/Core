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
      processing: false,
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
        $templateRow.find('.action-buttons').removeClass('small').addClass('tiny');
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
    var headerFooterHeight = 380; // Estimate height for header, footer, and other elements
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCJkYXRhVGFibGUiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJleHRlbnNpb25JZCIsInJlbW92ZSIsIlBieEFwaSIsIkV4dGVuc2lvbnNEZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwic2Nyb2xsQ29sbGFwc2UiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsIiR0ZW1wbGF0ZVJvdyIsImNsb25lIiwiJGF2YXRhciIsImZpbmQiLCJhdmF0YXIiLCJhZnRlciIsInVzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsImVtYWlsIiwicmVtb3ZlQ2xhc3MiLCIkZWRpdEJ1dHRvbiIsInVuZGVmaW5lZCIsIiRjbGlwYm9hcmRCdXR0b24iLCJpbmRleCIsInZhbHVlIiwiZXEiLCJodG1sIiwiZHJhd0NhbGxiYWNrIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsInBvcHVwIiwic2VhcmNoRGVib3VuY2VUaW1lciIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJ2YWwiLCJrZXlDb2RlIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJyZXNwb25zZSIsInJlc3VsdCIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVFeHRlbnNpb24iLCJjb3B5VG9DbGlwYm9hcmQiLCJzZWNyZXQiLCJleF9JbXBvc3NpYmxlVG9HZXRTZWNyZXQiLCIkZWwiLCJtYXNrc1NvcnQiLCJJbnB1dE1hc2tQYXR0ZXJucyIsImlucHV0bWFza3MiLCJpbnB1dG1hc2siLCJkZWZpbml0aW9ucyIsInZhbGlkYXRvciIsImNhcmRpbmFsaXR5IiwibWF0Y2giLCJyZXBsYWNlIiwibGlzdCIsImxpc3RLZXkiLCJzZWFyY2giLCJjb250ZW50IiwiaXNTZWN1cmVDb250ZXh0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkIiwidGV4dEFyZWEiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJmb2N1cyIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwiY29uc29sZSIsInJlbW92ZUNoaWxkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUUsSUFEVTs7QUFHcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFQyxDQUFDLENBQUMsbUJBQUQsQ0FQRTs7QUFTcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FiSTs7QUFlcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsbUJBQW1CLEVBQUNGLENBQUMsQ0FBQyxxQkFBRCxDQW5CRDs7QUFxQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRSxFQXpCUzs7QUEyQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEtBQUssRUFBRUosQ0FBQyxDQUFDLE1BQUQsQ0EvQlk7O0FBa0NwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxVQXRDb0Isd0JBc0NQO0FBRVQ7QUFDQUwsSUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTSxJQUFiLENBQWtCLFlBQVk7QUFDMUIsVUFBSU4sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxJQUFSLENBQWEsS0FBYixNQUF3QixFQUE1QixFQUFnQztBQUM1QlAsUUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxJQUFSLENBQWEsS0FBYixZ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TCxFQWdXYztBQUM5QixRQUFNTSxRQUFRLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixVQUF2QixDQUFqQjtBQUNBRixJQUFBQSxRQUFRLENBQUN0RCxLQUFULEdBQWVnRCxPQUFmO0FBQ0FPLElBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjQyxXQUFkLENBQTBCSixRQUExQjtBQUNBQSxJQUFBQSxRQUFRLENBQUNLLEtBQVQ7QUFBaUJMLElBQUFBLFFBQVEsQ0FBQ00sTUFBVDs7QUFDakIsUUFBRztBQUNDTCxNQUFBQSxRQUFRLENBQUNNLFdBQVQsQ0FBcUIsTUFBckI7QUFDSCxLQUZELENBRUUsT0FBTUMsR0FBTixFQUFXO0FBQ1RDLE1BQUFBLE9BQU8sQ0FBQ2xDLEtBQVIsQ0FBYyw2QkFBZCxFQUE2Q2lDLEdBQTdDO0FBQ0g7O0FBQ0RQLElBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjTyxXQUFkLENBQTBCVixRQUExQjtBQUNIO0FBM1dtQixDQUF4QjtBQThXQTtBQUNBO0FBQ0E7O0FBQ0E5SSxDQUFDLENBQUMrSSxRQUFELENBQUQsQ0FBWVUsS0FBWixDQUFrQixZQUFNO0FBQ3BCNUosRUFBQUEsZUFBZSxDQUFDUSxVQUFoQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2lwQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgSW5wdXRNYXNrUGF0dGVybnMsIFVzZXJNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUsIElucHV0bWFzayAqL1xuXG5cbi8qKlxuICogVGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUgaGFuZGxlcyB0aGUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGV4dGVuc2lvbnMgaW5kZXggcGFnZS5cbiAqXG4gKiBAbW9kdWxlIGV4dGVuc2lvbnNJbmRleFxuICovXG5jb25zdCBleHRlbnNpb25zSW5kZXggPSB7XG4gICAgbWFza0xpc3Q6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZXh0ZW5zaW9ucyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNMaXN0OiAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWwtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRib2R5OiAkKCdib2R5JyksXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUuXG4gICAgICogU2V0cyB1cCBuZWNlc3NhcnkgaW50ZXJhY3Rpdml0eSBhbmQgZmVhdHVyZXMgb24gdGhlIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBIYW5kbGUgYXZhdGFycyB3aXRoIG1pc3Npbmcgc3JjXG4gICAgICAgICQoJy5hdmF0YXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3NyYycpID09PSAnJykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gTW92ZSB0aGUgXCJBZGQgTmV3XCIgYnV0dG9uIHRvIHRoZSBmaXJzdCBlaWdodC1jb2x1bW4gZGl2LlxuICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXG4gICAgICAgIC8vIFNldCB1cCBkb3VibGUtY2xpY2sgYmVoYXZpb3Igb24gdGhlIGV4dGVuc2lvbiByb3dzLlxuICAgICAgICAkKCcuZXh0ZW5zaW9uLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtpZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBkZWxldGUgdGhlIGV4dGVuc2lvbiByZWNvcmQuXG4gICAgICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChleHRlbnNpb25JZCwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJEZWxldGVSZWNvcmQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgY29weSBzZWNyZXQgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuY2xpcGJvYXJkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2Rpdi5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGdldCB0aGUgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgICAgICAgIFNpcEFQSS5nZXRTZWNyZXQobnVtYmVyLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckdldFNlY3JldCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzZXQgZGF0YXRhYmxlIHNvcnRzIGFuZCBwYWdlXG4gICAgICAgICQoXCJhW2hyZWY9Jy9hZG1pbi1jYWJpbmV0L2V4dGVuc2lvbnMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11cIikub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpLnN0YXRlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnI3Jlc2V0LWNhY2hlJztcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSBcIiNyZXNldC1jYWNoZVwiKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnRGF0YVRhYmxlc19leHRlbnNpb25zLXRhYmxlXy9hZG1pbi1jYWJpbmV0L2V4dGVuc2lvbnMvaW5kZXgvJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBjb25zdCBwYWdlTGVuZ3RoID0gc2F2ZWRQYWdlTGVuZ3RoID8gc2F2ZWRQYWdlTGVuZ3RoIDogZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSh7XG4gICAgICAgICAgICAvLyBFbmFibGUgc3RhdGUgc2F2aW5nIHRvIGF1dG9tYXRpY2FsbHkgc2F2ZSBhbmQgcmVzdG9yZSB0aGUgdGFibGUncyBzdGF0ZVxuICAgICAgICAgICAgc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAxfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMywgIHRhcmdldHM6IDJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA0LCAgdGFyZ2V0czogM30sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDUsICB0YXJnZXRzOiA0fSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IC0xfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XG4gICAgICAgICAgICAgICAgZGV0YWlsczogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnVXNlcnMudXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZW5zaW9ucy5udW1iZXIgQVMgSU5URUdFUiknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZXJuYWxFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy5lbWFpbCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy8gc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcGxhdGVSb3cgID0gICQoJy5leHRlbnNpb24tcm93LXRwbCcpLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhdmF0YXIgPSAkdGVtcGxhdGVSb3cuZmluZCgnLmF2YXRhcicpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYXR0cignc3JjJyxkYXRhLmF2YXRhcik7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hZnRlcihkYXRhLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm51bWJlcicpLnRleHQoZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubW9iaWxlIGlucHV0JykuYXR0cigndmFsdWUnLCBkYXRhLm1vYmlsZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5lbWFpbCcpLnRleHQoZGF0YS5lbWFpbCk7XG5cbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucmVtb3ZlQ2xhc3MoJ3NtYWxsJykuYWRkQ2xhc3MoJ3RpbnknKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0ICRlZGl0QnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmVkaXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVkaXRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkZWRpdEJ1dHRvbi5hdHRyKCdocmVmJyxgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YS5pZH1gKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRjbGlwYm9hcmRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnLGRhdGEubnVtYmVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkLmVhY2goJCgndGQnLCAkdGVtcGxhdGVSb3cpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcShpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKCQodmFsdWUpLmh0bWwoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygkKHZhbHVlKS5hdHRyKCdjbGFzcycpKVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIGZvciBtb2JpbGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJyxzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZSA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSAzODA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZGVsZXRpbmcgYSByZWNvcmQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVsZXRlZCBleHRlbnNpb24ncyB0YWJsZSByb3cuXG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYHRyW2lkPSR7cmVzcG9uc2UuZGF0YS5pZH1dYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UuXG4gICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgY2V0IGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckdldFNlY3JldChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYGEuY2xpcGJvYXJkW2RhdGEtdmFsdWU9JHtyZXNwb25zZS5kYXRhLm51bWJlcn1dYCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguY29weVRvQ2xpcGJvYXJkKHJlc3BvbnNlLmRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGdldCBzZWNyZXQgd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSB0ZXh0IHBhc3NlZCBhcyBwYXJhbSB0byB0aGUgc3lzdGVtIGNsaXBib2FyZFxuICAgICAqIENoZWNrIGlmIHVzaW5nIEhUVFBTIGFuZCBuYXZpZ2F0b3IuY2xpcGJvYXJkIGlzIGF2YWlsYWJsZVxuICAgICAqIFRoZW4gdXNlcyBzdGFuZGFyZCBjbGlwYm9hcmQgQVBJLCBvdGhlcndpc2UgdXNlcyBmYWxsYmFja1xuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGlmICh3aW5kb3cuaXNTZWN1cmVDb250ZXh0ICYmIG5hdmlnYXRvci5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogUHV0IHRleHQgdmFyaWFibGUgaW50byBjbGlwYm9hcmQgZm9yIHVuc2VjdXJlZCBjb25uZWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gVGhlIHRleHQgdmFsdWUuXG4gICAgICovXG4gICAgdW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHRleHRBcmVhLnZhbHVlPWNvbnRlbnQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB0ZXh0QXJlYS5mb2N1cygpO3RleHRBcmVhLnNlbGVjdCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29weSB0byBjbGlwYm9hcmQnLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZXMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19