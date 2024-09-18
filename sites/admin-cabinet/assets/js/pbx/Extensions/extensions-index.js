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

    $("a[href='".concat(globalRootUrl, "extensions/index/#reset-cache']")).on('click', function (e) {
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
    }); // Restore the saved search phrase from DataTables state

    var state = extensionsIndex.dataTable.state.loaded();

    if (state && state.search) {
      extensionsIndex.$globalSearch.val(state.search.search); // Set the search field with the saved value
    } // Retrieves the value of 'search' query parameter from the URL.


    var searchValue = extensionsIndex.getQueryParam('search'); // Sets the global search input value and applies the filter if a search value is provided.

    if (searchValue) {
      extensionsIndex.$globalSearch.val(searchValue);
      extensionsIndex.applyFilter(searchValue);
    }
  },

  /**
   * Retrieves the value of a specified query parameter from the URL.
   *
   * @param {string} param - The name of the query parameter to retrieve.
   * @return {string|null} The value of the query parameter, or null if not found.
   */
  getQueryParam: function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * Calculates the number of rows that can fit on a page based on the current window height.
   * @returns {number}
   */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCJkYXRhVGFibGUiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJleHRlbnNpb25JZCIsInJlbW92ZSIsIlBieEFwaSIsIkV4dGVuc2lvbnNEZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwic2Nyb2xsQ29sbGFwc2UiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsIiR0ZW1wbGF0ZVJvdyIsImNsb25lIiwiJGF2YXRhciIsImZpbmQiLCJhdmF0YXIiLCJhZnRlciIsInVzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsImVtYWlsIiwicmVtb3ZlQ2xhc3MiLCIkZWRpdEJ1dHRvbiIsInVuZGVmaW5lZCIsIiRjbGlwYm9hcmRCdXR0b24iLCJpbmRleCIsInZhbHVlIiwiZXEiLCJodG1sIiwiZHJhd0NhbGxiYWNrIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsInBvcHVwIiwic2VhcmNoRGVib3VuY2VUaW1lciIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJ2YWwiLCJrZXlDb2RlIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJsb2FkZWQiLCJzZWFyY2giLCJzZWFyY2hWYWx1ZSIsImdldFF1ZXJ5UGFyYW0iLCJwYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImdldCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsInJlc3BvbnNlIiwicmVzdWx0IiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbiIsImNvcHlUb0NsaXBib2FyZCIsInNlY3JldCIsImV4X0ltcG9zc2libGVUb0dldFNlY3JldCIsIiRlbCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImNvbnRlbnQiLCJpc1NlY3VyZUNvbnRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQiLCJ0ZXh0QXJlYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImZvY3VzIiwic2VsZWN0IiwiZXhlY0NvbW1hbmQiLCJlcnIiLCJjb25zb2xlIiwicmVtb3ZlQ2hpbGQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFLEVBekJTOztBQTJCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsS0FBSyxFQUFFSixDQUFDLENBQUMsTUFBRCxDQS9CWTs7QUFrQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFVBdENvQix3QkFzQ1A7QUFFVDtBQUNBTCxJQUFBQSxDQUFDLENBQUMsU0FBRCxDQUFELENBQWFNLElBQWIsQ0FBa0IsWUFBWTtBQUMxQixVQUFJTixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFPLElBQVIs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QWNDLFdBQWQsQ0FBMEJKLFFBQTFCO0FBQ0FBLElBQUFBLFFBQVEsQ0FBQ0ssS0FBVDtBQUFpQkwsSUFBQUEsUUFBUSxDQUFDTSxNQUFUOztBQUNqQixRQUFHO0FBQ0NMLE1BQUFBLFFBQVEsQ0FBQ00sV0FBVCxDQUFxQixNQUFyQjtBQUNILEtBRkQsQ0FFRSxPQUFNQyxHQUFOLEVBQVc7QUFDVEMsTUFBQUEsT0FBTyxDQUFDakMsS0FBUixDQUFjLDZCQUFkLEVBQTZDZ0MsR0FBN0M7QUFDSDs7QUFDRFAsSUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWNPLFdBQWQsQ0FBMEJWLFFBQTFCO0FBQ0g7QUExWW1CLENBQXhCO0FBNllBO0FBQ0E7QUFDQTs7QUFDQXJKLENBQUMsQ0FBQ3NKLFFBQUQsQ0FBRCxDQUFZVSxLQUFaLENBQWtCLFlBQU07QUFDcEJuSyxFQUFBQSxlQUFlLENBQUNRLFVBQWhCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTaXBBUEksIFNlbWFudGljTG9jYWxpemF0aW9uLCBJbnB1dE1hc2tQYXR0ZXJucywgVXNlck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZSwgSW5wdXRtYXNrICovXG5cblxuLyoqXG4gKiBUaGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZSBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9ucyBpbmRleCBwYWdlLlxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0luZGV4XG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNJbmRleCA9IHtcbiAgICBtYXNrTGlzdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6ICQoJyNleHRlbnNpb25zLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIG5lY2Vzc2FyeSBpbnRlcmFjdGl2aXR5IGFuZCBmZWF0dXJlcyBvbiB0aGUgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEhhbmRsZSBhdmF0YXJzIHdpdGggbWlzc2luZyBzcmNcbiAgICAgICAgJCgnLmF2YXRhcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cignc3JjJykgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXYuXG4gICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRvdWJsZS1jbGljayBiZWhhdmlvciBvbiB0aGUgZXh0ZW5zaW9uIHJvd3MuXG4gICAgICAgICQoJy5leHRlbnNpb24tcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2lkfWA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBkZWxldGUgZnVuY3Rpb25hbGl0eSBvbiBkZWxldGUgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBleHRlbnNpb24gSUQgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGRlbGV0ZSB0aGUgZXh0ZW5zaW9uIHJlY29yZC5cbiAgICAgICAgICAgIFBieEFwaS5FeHRlbnNpb25zRGVsZXRlUmVjb3JkKGV4dGVuc2lvbklkLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckRlbGV0ZVJlY29yZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBjb3B5IHNlY3JldCBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5jbGlwYm9hcmQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnZGl2LmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIG51bWJlciBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIFBieEFwaSBtZXRob2QgdG8gZ2V0IHRoZSBleHRlbnNpb24gc2VjcmV0LlxuICAgICAgICAgICAgU2lwQVBJLmdldFNlY3JldChudW1iZXIsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyR2V0U2VjcmV0KTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXNldCBkYXRhdGFibGUgc29ydHMgYW5kIHBhZ2VcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKS5zdGF0ZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyNyZXNldC1jYWNoZSc7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aD09PSdhdXRvJyl7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpe1xuXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gXCIjcmVzZXQtY2FjaGVcIikge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ0RhdGFUYWJsZXNfZXh0ZW5zaW9ucy10YWJsZV8vYWRtaW4tY2FiaW5ldC9leHRlbnNpb25zL2luZGV4LycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoe1xuICAgICAgICAgICAgLy8gRW5hYmxlIHN0YXRlIHNhdmluZyB0byBhdXRvbWF0aWNhbGx5IHNhdmUgYW5kIHJlc3RvcmUgdGhlIHRhYmxlJ3Mgc3RhdGVcbiAgICAgICAgICAgIHN0YXRlU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgICAgICB7IGRlZmF1bHRDb250ZW50OiBcIi1cIiwgIHRhcmdldHM6IFwiX2FsbFwifSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDB9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMX0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDMsICB0YXJnZXRzOiAyfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNCwgIHRhcmdldHM6IDN9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA1LCAgdGFyZ2V0czogNH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAtMX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzcG9uc2l2ZToge1xuICAgICAgICAgICAgICAgIGRldGFpbHM6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3N0YXR1cycsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ1VzZXJzLnVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdDQVNUKEV4dGVuc2lvbnMubnVtYmVyIEFTIElOVEVHRVIpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdDQVNUKEV4dGVybmFsRXh0ZW5zaW9ucy5udW1iZXIgQVMgSU5URUdFUiknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnVXNlcnMuZW1haWwnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnYnV0dG9ucycsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbWzEsICdhc2MnXV0sXG4gICAgICAgICAgICBzZXJ2ZXJTaWRlOiB0cnVlLFxuICAgICAgICAgICAgcHJvY2Vzc2luZzogZmFsc2UsXG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0TmV3UmVjb3Jkc2AsXG4gICAgICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHN0YXRlU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogcGFnZUxlbmd0aCxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgLy8gc2Nyb2xsZXI6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBFeHRlbnNpb25zIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXBsYXRlUm93ICA9ICAkKCcuZXh0ZW5zaW9uLXJvdy10cGwnKS5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYXZhdGFyID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hdmF0YXInKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmF0dHIoJ3NyYycsZGF0YS5hdmF0YXIpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYWZ0ZXIoZGF0YS51c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5udW1iZXInKS50ZXh0KGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm1vYmlsZSBpbnB1dCcpLmF0dHIoJ3ZhbHVlJywgZGF0YS5tb2JpbGUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuZW1haWwnKS50ZXh0KGRhdGEuZW1haWwpO1xuXG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnJlbW92ZUNsYXNzKCdzbWFsbCcpLmFkZENsYXNzKCd0aW55Jyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkZWRpdEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5lZGl0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCRlZGl0QnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGVkaXRCdXR0b24uYXR0cignaHJlZicsYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGEuaWR9YClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkY2xpcGJvYXJkQnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyxkYXRhLm51bWJlcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtdmFsdWUnLCBkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJC5lYWNoKCQoJ3RkJywgJHRlbXBsYXRlUm93KSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbCgkKHZhbHVlKS5odG1sKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJCh2YWx1ZSkuYXR0cignY2xhc3MnKSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBmb3IgbW9iaWxlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVJbnB1dG1hc2soJCgnaW5wdXQubW9iaWxlLW51bWJlci1pbnB1dCcpKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcG9wdXBzLlxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBzYXZlZCBzZWFyY2ggcGhyYXNlIGZyb20gRGF0YVRhYmxlcyBzdGF0ZVxuICAgICAgICBjb25zdCBzdGF0ZSA9IGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSBleHRlbnNpb25zSW5kZXguZ2V0UXVlcnlQYXJhbSgnc2VhcmNoJyk7XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCB2YWx1ZSBhbmQgYXBwbGllcyB0aGUgZmlsdGVyIGlmIGEgc2VhcmNoIHZhbHVlIGlzIHByb3ZpZGVkLlxuICAgICAgICBpZiAoc2VhcmNoVmFsdWUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXG4gICAgICogQHJldHVybiB7c3RyaW5nfG51bGx9IFRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyLCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICAgKi9cbiAgICBnZXRRdWVyeVBhcmFtKHBhcmFtKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHJldHVybiB1cmxQYXJhbXMuZ2V0KHBhcmFtKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSAzODA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZGVsZXRpbmcgYSByZWNvcmQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVsZXRlZCBleHRlbnNpb24ncyB0YWJsZSByb3cuXG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYHRyW2lkPSR7cmVzcG9uc2UuZGF0YS5pZH1dYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UuXG4gICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgY2V0IGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckdldFNlY3JldChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYGEuY2xpcGJvYXJkW2RhdGEtdmFsdWU9JHtyZXNwb25zZS5kYXRhLm51bWJlcn1dYCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguY29weVRvQ2xpcGJvYXJkKHJlc3BvbnNlLmRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGdldCBzZWNyZXQgd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSB0ZXh0IHBhc3NlZCBhcyBwYXJhbSB0byB0aGUgc3lzdGVtIGNsaXBib2FyZFxuICAgICAqIENoZWNrIGlmIHVzaW5nIEhUVFBTIGFuZCBuYXZpZ2F0b3IuY2xpcGJvYXJkIGlzIGF2YWlsYWJsZVxuICAgICAqIFRoZW4gdXNlcyBzdGFuZGFyZCBjbGlwYm9hcmQgQVBJLCBvdGhlcndpc2UgdXNlcyBmYWxsYmFja1xuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGlmICh3aW5kb3cuaXNTZWN1cmVDb250ZXh0ICYmIG5hdmlnYXRvci5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogUHV0IHRleHQgdmFyaWFibGUgaW50byBjbGlwYm9hcmQgZm9yIHVuc2VjdXJlZCBjb25uZWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gVGhlIHRleHQgdmFsdWUuXG4gICAgICovXG4gICAgdW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHRleHRBcmVhLnZhbHVlPWNvbnRlbnQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB0ZXh0QXJlYS5mb2N1cygpO3RleHRBcmVhLnNlbGVjdCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29weSB0byBjbGlwYm9hcmQnLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZXMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19