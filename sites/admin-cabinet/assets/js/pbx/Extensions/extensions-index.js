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
   * The page length selector.
   * @type {jQuery}
   */
  $searchExtensionsInput: $('#search-extensions-input'),

  /**
   * The data table object.
   * @type {Object}
   */
  dataTable: {},

  /**
   * Timeout reference for retry attempts
   * @type {number}
   */
  retryTimeout: null,

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
    extensionsIndex.$pageLengthSelector.on('click', function (event) {
      event.stopPropagation(); // Prevent the event from bubbling
    }); // Initialize the Search component

    extensionsIndex.$searchExtensionsInput.search({
      minCharacters: 0,
      searchOnFocus: false,
      searchFields: ['title'],
      showNoResults: false,
      source: [{
        title: globalTranslate.ex_SearchByExtension,
        value: 'number:'
      }, {
        title: globalTranslate.ex_SearchByMobile,
        value: 'mobile:'
      }, {
        title: globalTranslate.ex_SearchByEmail,
        value: 'email:'
      }, {
        title: globalTranslate.ex_SearchByID,
        value: 'id:'
      }, {
        title: globalTranslate.ex_SearchByCustomPhrase,
        value: ''
      }],
      onSelect: function onSelect(result, response) {
        extensionsIndex.$globalSearch.val(result.value);
        extensionsIndex.$searchExtensionsInput.search('hide results');
        return false;
      }
    }); // Start the search when you click on the icon

    $('#search-icon').on('click', function () {
      extensionsIndex.$globalSearch.focus();
      extensionsIndex.$searchExtensionsInput.search('query');
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
        type: 'POST',
        error: function error(xhr, textStatus, _error) {
          // Suppress the default error alert
          console.log('DataTable request failed, will retry in 3 seconds'); // Clear any existing retry timeout

          if (extensionsIndex.retryTimeout) {
            clearTimeout(extensionsIndex.retryTimeout);
          } // Set up retry after 3 seconds


          extensionsIndex.retryTimeout = setTimeout(function () {
            extensionsIndex.dataTable.ajax.reload(null, false);
          }, 3000);
          return false; // Prevent default error handling
        }
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
      },
      // Disable DataTables error alerts completely
      fnInitComplete: function fnInitComplete() {
        // Override DataTables error event handler
        $.fn.dataTable.ext.errMode = 'none';
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
    var headerFooterHeight = 390; // Estimate height for header, footer, and other elements
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwicmV0cnlUaW1lb3V0IiwiJGJvZHkiLCJpbml0aWFsaXplIiwiZWFjaCIsImF0dHIiLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiZXh0ZW5zaW9uSWQiLCJyZW1vdmUiLCJQYnhBcGkiLCJFeHRlbnNpb25zRGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsIm51bWJlciIsIlNpcEFQSSIsImdldFNlY3JldCIsImNiQWZ0ZXJHZXRTZWNyZXQiLCJEYXRhVGFibGUiLCJzdGF0ZSIsImNsZWFyIiwiaGFzaCIsInJlbG9hZCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY29uc29sZSIsImxvZyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJzY3JvbGxDb2xsYXBzZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiJHRlbXBsYXRlUm93IiwiY2xvbmUiLCIkYXZhdGFyIiwiZmluZCIsImF2YXRhciIsImFmdGVyIiwidXNlcm5hbWUiLCJ0ZXh0IiwibW9iaWxlIiwiZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiJGNsaXBib2FyZEJ1dHRvbiIsImluZGV4IiwiZXEiLCJodG1sIiwiZHJhd0NhbGxiYWNrIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsInBvcHVwIiwiZm5Jbml0Q29tcGxldGUiLCJmbiIsImV4dCIsImVyck1vZGUiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwia2V5Q29kZSIsImxlbmd0aCIsImFwcGx5RmlsdGVyIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbiIsImNvcHlUb0NsaXBib2FyZCIsInNlY3JldCIsImV4X0ltcG9zc2libGVUb0dldFNlY3JldCIsIiRlbCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsImNvbnRlbnQiLCJpc1NlY3VyZUNvbnRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQiLCJ0ZXh0QXJlYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwicmVtb3ZlQ2hpbGQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsc0JBQXNCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQXpCTDs7QUEyQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFNBQVMsRUFBRSxFQS9CUzs7QUFpQ3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQXJDTTs7QUF1Q3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLEtBQUssRUFBRU4sQ0FBQyxDQUFDLE1BQUQsQ0EzQ1k7O0FBOENwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxVQWxEb0Isd0JBa0RQO0FBRVQ7QUFDQVAsSUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhUSxJQUFiLENBQWtCLFlBQVk7QUFDMUIsVUFBSVIsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRUyxJQUFSLENBQWEsS0FBYixNQUF3QixFQUE1QixFQUFnQztBQUM1QlQsUUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRUyxJQUFSLENBQWEsS0FBYixZQUF1QkMsYUFBdkI7QUFDSDtBQUNKLEtBSkQsRUFIUyxDQVNUOztBQUNBYixJQUFBQSxlQUFlLENBQUNjLG1CQUFoQixHQVZTLENBWVQ7O0FBQ0FYLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCWSxRQUFyQixDQUE4QlosQ0FBQyxDQUFDLHdCQUFELENBQS9CLEVBYlMsQ0FlVDs7QUFDQUEsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJhLEVBQXZCLENBQTBCLFVBQTFCLEVBQXNDLFVBQUNDLENBQUQsRUFBTztBQUN6QyxVQUFNQyxFQUFFLEdBQUdmLENBQUMsQ0FBQ2MsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQlIsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBUyxNQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJULGFBQXJCLCtCQUF1REssRUFBdkQ7QUFDSCxLQUhELEVBaEJTLENBcUJUOztBQUNBbEIsSUFBQUEsZUFBZSxDQUFDUyxLQUFoQixDQUFzQk8sRUFBdEIsQ0FBeUIsT0FBekIsRUFBa0MsVUFBbEMsRUFBOEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2pEQSxNQUFBQSxDQUFDLENBQUNNLGNBQUY7QUFDQXBCLE1BQUFBLENBQUMsQ0FBQ2MsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUssUUFBWixDQUFxQixVQUFyQixFQUZpRCxDQUdqRDs7QUFDQSxVQUFNQyxXQUFXLEdBQUd0QixDQUFDLENBQUNjLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJSLElBQTFCLENBQStCLElBQS9CLENBQXBCLENBSmlELENBTWpEOztBQUNBVCxNQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CdUIsTUFBbkIsR0FQaUQsQ0FTakQ7O0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0Msc0JBQVAsQ0FBOEJILFdBQTlCLEVBQTJDekIsZUFBZSxDQUFDNkIsbUJBQTNEO0FBQ0gsS0FYRCxFQXRCUyxDQW1DVDs7QUFDQTdCLElBQUFBLGVBQWUsQ0FBQ1MsS0FBaEIsQ0FBc0JPLEVBQXRCLENBQXlCLE9BQXpCLEVBQWtDLGFBQWxDLEVBQWlELFVBQUNDLENBQUQsRUFBTztBQUNwREEsTUFBQUEsQ0FBQyxDQUFDTSxjQUFGO0FBQ0FwQixNQUFBQSxDQUFDLENBQUNjLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsWUFBcEIsRUFBa0NJLFFBQWxDLENBQTJDLFVBQTNDLEVBRm9ELENBSXBEOztBQUNBLFVBQU1NLE1BQU0sR0FBRzNCLENBQUMsQ0FBQ2MsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQlIsSUFBMUIsQ0FBK0IsWUFBL0IsQ0FBZixDQUxvRCxDQU9wRDs7QUFDQVQsTUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQnVCLE1BQW5CLEdBUm9ELENBVXBEOztBQUNBSyxNQUFBQSxNQUFNLENBQUNDLFNBQVAsQ0FBaUJGLE1BQWpCLEVBQXlCOUIsZUFBZSxDQUFDaUMsZ0JBQXpDO0FBQ0gsS0FaRCxFQXBDUyxDQW1EVDs7QUFDQTlCLElBQUFBLENBQUMsbUJBQVlVLGFBQVoscUNBQUQsQ0FBNkRHLEVBQTdELENBQWdFLE9BQWhFLEVBQXlFLFVBQVNDLENBQVQsRUFBWTtBQUM3RUEsTUFBQUEsQ0FBQyxDQUFDTSxjQUFGO0FBQ0F2QixNQUFBQSxlQUFlLENBQUNFLGVBQWhCLENBQWdDZ0MsU0FBaEMsR0FBNENDLEtBQTVDLENBQWtEQyxLQUFsRDtBQUNBZixNQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JlLElBQWhCLEdBQXVCLGNBQXZCO0FBQ0FoQixNQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JnQixNQUFoQjtBQUNQLEtBTEQsRUFwRFMsQ0EyRFQ7O0FBQ0F0QyxJQUFBQSxlQUFlLENBQUNLLG1CQUFoQixDQUFvQ2tDLFFBQXBDLENBQTZDO0FBQ3pDQyxNQUFBQSxRQUR5QyxvQkFDaENDLFVBRGdDLEVBQ3BCO0FBQ2pCLFlBQUlBLFVBQVUsS0FBRyxNQUFqQixFQUF3QjtBQUNwQkEsVUFBQUEsVUFBVSxHQUFHekMsZUFBZSxDQUFDMEMsbUJBQWhCLEVBQWI7QUFDQUMsVUFBQUEsWUFBWSxDQUFDQyxVQUFiLENBQXdCLDJCQUF4QjtBQUNILFNBSEQsTUFHTztBQUNIRCxVQUFBQSxZQUFZLENBQUNFLE9BQWIsQ0FBcUIsMkJBQXJCLEVBQWtESixVQUFsRDtBQUNIOztBQUNEekMsUUFBQUEsZUFBZSxDQUFDTyxTQUFoQixDQUEwQnVDLElBQTFCLENBQStCQyxHQUEvQixDQUFtQ04sVUFBbkMsRUFBK0NPLElBQS9DO0FBQ0g7QUFUd0MsS0FBN0M7QUFXQWhELElBQUFBLGVBQWUsQ0FBQ0ssbUJBQWhCLENBQW9DVyxFQUFwQyxDQUF1QyxPQUF2QyxFQUFnRCxVQUFTaUMsS0FBVCxFQUFnQjtBQUM1REEsTUFBQUEsS0FBSyxDQUFDQyxlQUFOLEdBRDRELENBQ25DO0FBQzVCLEtBRkQsRUF2RVMsQ0EwRVQ7O0FBQ0FsRCxJQUFBQSxlQUFlLENBQUNNLHNCQUFoQixDQUF1QzZDLE1BQXZDLENBQThDO0FBQzFDQyxNQUFBQSxhQUFhLEVBQUUsQ0FEMkI7QUFFMUNDLE1BQUFBLGFBQWEsRUFBRSxLQUYyQjtBQUcxQ0MsTUFBQUEsWUFBWSxFQUFFLENBQUMsT0FBRCxDQUg0QjtBQUkxQ0MsTUFBQUEsYUFBYSxFQUFFLEtBSjJCO0FBSzFDQyxNQUFBQSxNQUFNLEVBQUUsQ0FDSjtBQUFFQyxRQUFBQSxLQUFLLEVBQUVDLGVBQWUsQ0FBQ0Msb0JBQXpCO0FBQStDQyxRQUFBQSxLQUFLLEVBQUU7QUFBdEQsT0FESSxFQUVKO0FBQUVILFFBQUFBLEtBQUssRUFBRUMsZUFBZSxDQUFDRyxpQkFBekI7QUFBNENELFFBQUFBLEtBQUssRUFBRTtBQUFuRCxPQUZJLEVBR0o7QUFBRUgsUUFBQUEsS0FBSyxFQUFFQyxlQUFlLENBQUNJLGdCQUF6QjtBQUEyQ0YsUUFBQUEsS0FBSyxFQUFFO0FBQWxELE9BSEksRUFJSjtBQUFFSCxRQUFBQSxLQUFLLEVBQUVDLGVBQWUsQ0FBQ0ssYUFBekI7QUFBd0NILFFBQUFBLEtBQUssRUFBRTtBQUEvQyxPQUpJLEVBS0o7QUFBRUgsUUFBQUEsS0FBSyxFQUFFQyxlQUFlLENBQUNNLHVCQUF6QjtBQUFrREosUUFBQUEsS0FBSyxFQUFFO0FBQXpELE9BTEksQ0FMa0M7QUFZMUNLLE1BQUFBLFFBQVEsRUFBRSxrQkFBU0MsTUFBVCxFQUFpQkMsUUFBakIsRUFBMkI7QUFDakNuRSxRQUFBQSxlQUFlLENBQUNJLGFBQWhCLENBQThCZ0UsR0FBOUIsQ0FBa0NGLE1BQU0sQ0FBQ04sS0FBekM7QUFDQTVELFFBQUFBLGVBQWUsQ0FBQ00sc0JBQWhCLENBQXVDNkMsTUFBdkMsQ0FBOEMsY0FBOUM7QUFDQSxlQUFPLEtBQVA7QUFDSDtBQWhCeUMsS0FBOUMsRUEzRVMsQ0ErRlQ7O0FBQ0FoRCxJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCYSxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDaEIsTUFBQUEsZUFBZSxDQUFDSSxhQUFoQixDQUE4QmlFLEtBQTlCO0FBQ0FyRSxNQUFBQSxlQUFlLENBQUNNLHNCQUFoQixDQUF1QzZDLE1BQXZDLENBQThDLE9BQTlDO0FBQ0gsS0FIRDtBQUtILEdBdkptQjtBQXlKcEI7QUFDQXJDLEVBQUFBLG1CQTFKb0IsaUNBMEpDO0FBRWpCLFFBQUlPLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQmUsSUFBaEIsS0FBeUIsY0FBN0IsRUFBNkM7QUFDekNNLE1BQUFBLFlBQVksQ0FBQ0MsVUFBYixDQUF3Qiw4REFBeEI7QUFDSCxLQUpnQixDQU1qQjs7O0FBQ0EsUUFBTTBCLGVBQWUsR0FBRzNCLFlBQVksQ0FBQzRCLE9BQWIsQ0FBcUIsMkJBQXJCLENBQXhCO0FBQ0EsUUFBTTlCLFVBQVUsR0FBRzZCLGVBQWUsR0FBR0EsZUFBSCxHQUFxQnRFLGVBQWUsQ0FBQzBDLG1CQUFoQixFQUF2RDtBQUVBMUMsSUFBQUEsZUFBZSxDQUFDRSxlQUFoQixDQUFnQ2dDLFNBQWhDLENBQTBDO0FBQ3RDO0FBQ0FzQyxNQUFBQSxTQUFTLEVBQUUsSUFGMkI7QUFHdENDLE1BQUFBLFVBQVUsRUFBRSxDQUNSO0FBQUVDLFFBQUFBLGNBQWMsRUFBRSxHQUFsQjtBQUF3QkMsUUFBQUEsT0FBTyxFQUFFO0FBQWpDLE9BRFEsRUFFUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFO0FBQW5DLE9BRlEsRUFHUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFO0FBQW5DLE9BSFEsRUFJUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFO0FBQW5DLE9BSlEsRUFLUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFO0FBQW5DLE9BTFEsRUFNUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFO0FBQW5DLE9BTlEsRUFPUjtBQUFFQyxRQUFBQSxrQkFBa0IsRUFBRSxDQUF0QjtBQUEwQkQsUUFBQUEsT0FBTyxFQUFFLENBQUM7QUFBcEMsT0FQUSxDQUgwQjtBQVl0Q0UsTUFBQUEsVUFBVSxFQUFFO0FBQ1JDLFFBQUFBLE9BQU8sRUFBRTtBQURELE9BWjBCO0FBZXRDQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxRQUFBQSxTQUFTLEVBQUUsS0FGZjtBQUV1QjtBQUNuQkMsUUFBQUEsVUFBVSxFQUFFLEtBSGhCLENBR3VCOztBQUh2QixPQURLLEVBTUw7QUFDSUYsUUFBQUEsSUFBSSxFQUFFLFVBRFY7QUFFSUcsUUFBQUEsSUFBSSxFQUFFO0FBRlYsT0FOSyxFQVVMO0FBQ0lILFFBQUFBLElBQUksRUFBRSxRQURWO0FBRUlHLFFBQUFBLElBQUksRUFBRTtBQUZWLE9BVkssRUFjTDtBQUNJSCxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJRyxRQUFBQSxJQUFJLEVBQUU7QUFGVixPQWRLLEVBa0JMO0FBQ0lILFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlHLFFBQUFBLElBQUksRUFBRTtBQUZWLE9BbEJLLEVBc0JMO0FBQ0lILFFBQUFBLElBQUksRUFBRSxTQURWO0FBRUlDLFFBQUFBLFNBQVMsRUFBRSxLQUZmO0FBRXVCO0FBQ25CQyxRQUFBQSxVQUFVLEVBQUUsS0FIaEIsQ0FHd0I7O0FBSHhCLE9BdEJLLENBZjZCO0FBMkN0Q0UsTUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFELEVBQUksS0FBSixDQUFELENBM0MrQjtBQTRDdENDLE1BQUFBLFVBQVUsRUFBRSxJQTVDMEI7QUE2Q3RDQyxNQUFBQSxVQUFVLEVBQUUsS0E3QzBCO0FBOEN0Q0MsTUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLFFBQUFBLEdBQUcsWUFBSzNFLGFBQUwsNkJBREQ7QUFFRjRFLFFBQUFBLElBQUksRUFBRSxNQUZKO0FBR0ZDLFFBQUFBLEtBQUssRUFBRSxlQUFTQyxHQUFULEVBQWNDLFVBQWQsRUFBMEJGLE1BQTFCLEVBQWlDO0FBQ3BDO0FBQ0FHLFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG1EQUFaLEVBRm9DLENBSXBDOztBQUNBLGNBQUk5RixlQUFlLENBQUNRLFlBQXBCLEVBQWtDO0FBQzlCdUYsWUFBQUEsWUFBWSxDQUFDL0YsZUFBZSxDQUFDUSxZQUFqQixDQUFaO0FBQ0gsV0FQbUMsQ0FTcEM7OztBQUNBUixVQUFBQSxlQUFlLENBQUNRLFlBQWhCLEdBQStCd0YsVUFBVSxDQUFDLFlBQVc7QUFDakRoRyxZQUFBQSxlQUFlLENBQUNPLFNBQWhCLENBQTBCZ0YsSUFBMUIsQ0FBK0JqRCxNQUEvQixDQUFzQyxJQUF0QyxFQUE0QyxLQUE1QztBQUNILFdBRndDLEVBRXRDLElBRnNDLENBQXpDO0FBSUEsaUJBQU8sS0FBUCxDQWRvQyxDQWN0QjtBQUNqQjtBQWxCQyxPQTlDZ0M7QUFrRXRDMkQsTUFBQUEsTUFBTSxFQUFFLElBbEU4QjtBQW1FdEM7QUFDQUMsTUFBQUEsSUFBSSxFQUFFLE1BcEVnQztBQXFFdENDLE1BQUFBLFdBQVcsRUFBRSxJQXJFeUI7QUFzRXRDMUQsTUFBQUEsVUFBVSxFQUFFQSxVQXRFMEI7QUF1RXRDMkQsTUFBQUEsY0FBYyxFQUFFLElBdkVzQjtBQXdFdEM7QUFDQUMsTUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0MscUJBekVPOztBQTBFdEM7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNZQyxNQUFBQSxVQS9Fc0Msc0JBK0UzQkMsR0EvRTJCLEVBK0V0QnRCLElBL0VzQixFQStFaEI7QUFDbEIsWUFBTXVCLFlBQVksR0FBS3ZHLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCd0csS0FBeEIsQ0FBOEIsSUFBOUIsQ0FBdkI7QUFDQSxZQUFNQyxPQUFPLEdBQUdGLFlBQVksQ0FBQ0csSUFBYixDQUFrQixTQUFsQixDQUFoQjtBQUNBRCxRQUFBQSxPQUFPLENBQUNoRyxJQUFSLENBQWEsS0FBYixFQUFtQnVFLElBQUksQ0FBQzJCLE1BQXhCO0FBQ0FGLFFBQUFBLE9BQU8sQ0FBQ0csS0FBUixDQUFjNUIsSUFBSSxDQUFDNkIsUUFBbkI7QUFDQU4sUUFBQUEsWUFBWSxDQUFDRyxJQUFiLENBQWtCLFNBQWxCLEVBQTZCSSxJQUE3QixDQUFrQzlCLElBQUksQ0FBQ3JELE1BQXZDO0FBQ0E0RSxRQUFBQSxZQUFZLENBQUNHLElBQWIsQ0FBa0IsZUFBbEIsRUFBbUNqRyxJQUFuQyxDQUF3QyxPQUF4QyxFQUFpRHVFLElBQUksQ0FBQytCLE1BQXREO0FBQ0FSLFFBQUFBLFlBQVksQ0FBQ0csSUFBYixDQUFrQixRQUFsQixFQUE0QkksSUFBNUIsQ0FBaUM5QixJQUFJLENBQUNnQyxLQUF0QztBQUVBVCxRQUFBQSxZQUFZLENBQUNHLElBQWIsQ0FBa0IsaUJBQWxCLEVBQXFDTyxXQUFyQyxDQUFpRCxPQUFqRCxFQUEwRDVGLFFBQTFELENBQW1FLE1BQW5FO0FBRUEsWUFBTTZGLFdBQVcsR0FBR1gsWUFBWSxDQUFDRyxJQUFiLENBQWtCLDhCQUFsQixDQUFwQjs7QUFDQSxZQUFJUSxXQUFXLEtBQUdDLFNBQWxCLEVBQTRCO0FBQ3hCRCxVQUFBQSxXQUFXLENBQUN6RyxJQUFaLENBQWlCLE1BQWpCLFlBQTJCQyxhQUEzQiwrQkFBNkRzRSxJQUFJLENBQUNqRSxFQUFsRTtBQUNIOztBQUVELFlBQU1xRyxnQkFBZ0IsR0FBR2IsWUFBWSxDQUFDRyxJQUFiLENBQWtCLG1DQUFsQixDQUF6Qjs7QUFDQSxZQUFJVSxnQkFBZ0IsS0FBR0QsU0FBdkIsRUFBaUM7QUFDN0JDLFVBQUFBLGdCQUFnQixDQUFDM0csSUFBakIsQ0FBc0IsWUFBdEIsRUFBbUN1RSxJQUFJLENBQUNyRCxNQUF4QztBQUNIOztBQUNEM0IsUUFBQUEsQ0FBQyxDQUFDc0csR0FBRCxDQUFELENBQU83RixJQUFQLENBQVksWUFBWixFQUEwQnVFLElBQUksQ0FBQ3JELE1BQS9CO0FBQ0EzQixRQUFBQSxDQUFDLENBQUNRLElBQUYsQ0FBT1IsQ0FBQyxDQUFDLElBQUQsRUFBT3VHLFlBQVAsQ0FBUixFQUE4QixVQUFDYyxLQUFELEVBQVE1RCxLQUFSLEVBQWtCO0FBQzVDekQsVUFBQUEsQ0FBQyxDQUFDLElBQUQsRUFBT3NHLEdBQVAsQ0FBRCxDQUFhZ0IsRUFBYixDQUFnQkQsS0FBaEIsRUFDS0UsSUFETCxDQUNVdkgsQ0FBQyxDQUFDeUQsS0FBRCxDQUFELENBQVM4RCxJQUFULEVBRFYsRUFFS2xHLFFBRkwsQ0FFY3JCLENBQUMsQ0FBQ3lELEtBQUQsQ0FBRCxDQUFTaEQsSUFBVCxDQUFjLE9BQWQsQ0FGZDtBQUlILFNBTEQ7QUFNSCxPQTFHcUM7O0FBMkd0QztBQUNaO0FBQ0E7QUFDWStHLE1BQUFBLFlBOUdzQywwQkE4R3ZCO0FBQ1g7QUFDQTNILFFBQUFBLGVBQWUsQ0FBQzRILG1CQUFoQixDQUFvQ3pILENBQUMsQ0FBQywyQkFBRCxDQUFyQyxFQUZXLENBR1g7O0FBQ0FBLFFBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0IwSCxLQUFoQixDQUFzQjtBQUNsQjdHLFVBQUFBLEVBQUUsRUFBRTtBQURjLFNBQXRCO0FBR0gsT0FySHFDO0FBc0h0QztBQUNBOEcsTUFBQUEsY0FBYyxFQUFFLDBCQUFXO0FBQ3ZCO0FBQ0EzSCxRQUFBQSxDQUFDLENBQUM0SCxFQUFGLENBQUt4SCxTQUFMLENBQWV5SCxHQUFmLENBQW1CQyxPQUFuQixHQUE2QixNQUE3QjtBQUNIO0FBMUhxQyxLQUExQyxFQVZpQixDQXVJakI7O0FBQ0EsUUFBSTNELGVBQUosRUFBcUI7QUFDakJ0RSxNQUFBQSxlQUFlLENBQUNLLG1CQUFoQixDQUFvQ2tDLFFBQXBDLENBQTZDLFdBQTdDLEVBQXlEK0IsZUFBekQ7QUFDSDs7QUFFRHRFLElBQUFBLGVBQWUsQ0FBQ08sU0FBaEIsR0FBNEJQLGVBQWUsQ0FBQ0UsZUFBaEIsQ0FBZ0NnQyxTQUFoQyxFQUE1QixDQTVJaUIsQ0E4SWpCOztBQUNBLFFBQUlnRyxtQkFBbUIsR0FBRyxJQUExQjtBQUVBbEksSUFBQUEsZUFBZSxDQUFDSSxhQUFoQixDQUE4QlksRUFBOUIsQ0FBaUMsT0FBakMsRUFBMEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQzdDO0FBQ0E4RSxNQUFBQSxZQUFZLENBQUNtQyxtQkFBRCxDQUFaLENBRjZDLENBSTdDOztBQUNBQSxNQUFBQSxtQkFBbUIsR0FBR2xDLFVBQVUsQ0FBQyxZQUFNO0FBQ25DLFlBQU1pQixJQUFJLEdBQUdqSCxlQUFlLENBQUNJLGFBQWhCLENBQThCZ0UsR0FBOUIsRUFBYixDQURtQyxDQUVuQzs7QUFDQSxZQUFJbkQsQ0FBQyxDQUFDa0gsT0FBRixLQUFjLEVBQWQsSUFBb0JsSCxDQUFDLENBQUNrSCxPQUFGLEtBQWMsQ0FBbEMsSUFBdUNsQixJQUFJLENBQUNtQixNQUFMLElBQWUsQ0FBMUQsRUFBNkQ7QUFDekRwSSxVQUFBQSxlQUFlLENBQUNxSSxXQUFoQixDQUE0QnBCLElBQTVCO0FBQ0g7QUFDSixPQU4rQixFQU03QixHQU42QixDQUFoQyxDQUw2QyxDQVdwQztBQUNaLEtBWkQ7QUFjQWpILElBQUFBLGVBQWUsQ0FBQ08sU0FBaEIsQ0FBMEJTLEVBQTFCLENBQTZCLE1BQTdCLEVBQXFDLFlBQU07QUFDdkNoQixNQUFBQSxlQUFlLENBQUNJLGFBQWhCLENBQThCZ0IsT0FBOUIsQ0FBc0MsS0FBdEMsRUFBNkNnRyxXQUE3QyxDQUF5RCxTQUF6RDtBQUNILEtBRkQsRUEvSmlCLENBb0tqQjs7QUFDQSxRQUFNakYsS0FBSyxHQUFHbkMsZUFBZSxDQUFDTyxTQUFoQixDQUEwQjRCLEtBQTFCLENBQWdDbUcsTUFBaEMsRUFBZDs7QUFDQSxRQUFJbkcsS0FBSyxJQUFJQSxLQUFLLENBQUNnQixNQUFuQixFQUEyQjtBQUN2Qm5ELE1BQUFBLGVBQWUsQ0FBQ0ksYUFBaEIsQ0FBOEJnRSxHQUE5QixDQUFrQ2pDLEtBQUssQ0FBQ2dCLE1BQU4sQ0FBYUEsTUFBL0MsRUFEdUIsQ0FDaUM7QUFDM0QsS0F4S2dCLENBMEtqQjs7O0FBQ0EsUUFBTW9GLFdBQVcsR0FBR3ZJLGVBQWUsQ0FBQ3dJLGFBQWhCLENBQThCLFFBQTlCLENBQXBCLENBM0tpQixDQTZLakI7O0FBQ0EsUUFBSUQsV0FBSixFQUFpQjtBQUNidkksTUFBQUEsZUFBZSxDQUFDSSxhQUFoQixDQUE4QmdFLEdBQTlCLENBQWtDbUUsV0FBbEM7QUFDQXZJLE1BQUFBLGVBQWUsQ0FBQ3FJLFdBQWhCLENBQTRCRSxXQUE1QjtBQUNIO0FBQ0osR0E1VW1COztBQThVcEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBcFZvQix5QkFvVk5DLEtBcFZNLEVBb1ZDO0FBQ2pCLFFBQU1DLFNBQVMsR0FBRyxJQUFJQyxlQUFKLENBQW9CdEgsTUFBTSxDQUFDQyxRQUFQLENBQWdCNkIsTUFBcEMsQ0FBbEI7QUFDQSxXQUFPdUYsU0FBUyxDQUFDRSxHQUFWLENBQWNILEtBQWQsQ0FBUDtBQUNILEdBdlZtQjs7QUF5VnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0kvRixFQUFBQSxtQkE3Vm9CLGlDQTZWRTtBQUNsQjtBQUNBLFFBQUltRyxTQUFTLEdBQUc3SSxlQUFlLENBQUNFLGVBQWhCLENBQWdDMkcsSUFBaEMsQ0FBcUMsSUFBckMsRUFBMkNpQyxLQUEzQyxHQUFtREMsV0FBbkQsRUFBaEIsQ0FGa0IsQ0FJbEI7O0FBQ0EsUUFBTUMsWUFBWSxHQUFHM0gsTUFBTSxDQUFDNEgsV0FBNUI7QUFDQSxRQUFNQyxrQkFBa0IsR0FBRyxHQUEzQixDQU5rQixDQU1jO0FBRWhDOztBQUNBLFdBQU9DLElBQUksQ0FBQ0MsR0FBTCxDQUFTRCxJQUFJLENBQUNFLEtBQUwsQ0FBVyxDQUFDTCxZQUFZLEdBQUdFLGtCQUFoQixJQUFzQ0wsU0FBakQsQ0FBVCxFQUFzRSxDQUF0RSxDQUFQO0FBQ0gsR0F2V21COztBQXlXcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSWhILEVBQUFBLG1CQTdXb0IsK0JBNldBc0MsUUE3V0EsRUE2V1M7QUFDekIsUUFBSUEsUUFBUSxDQUFDRCxNQUFULEtBQW9CLElBQXhCLEVBQThCO0FBQzFCO0FBQ0FsRSxNQUFBQSxlQUFlLENBQUNFLGVBQWhCLENBQWdDMkcsSUFBaEMsaUJBQThDMUMsUUFBUSxDQUFDZ0IsSUFBVCxDQUFjakUsRUFBNUQsUUFBbUVRLE1BQW5FLEdBRjBCLENBRzFCOztBQUNBNEgsTUFBQUEsVUFBVSxDQUFDQyxlQUFYO0FBQ0gsS0FMRCxNQUtPO0FBQ0g7QUFDQUMsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCdEYsUUFBUSxDQUFDdUYsUUFBVCxDQUFrQmhFLEtBQXhDLEVBQStDaEMsZUFBZSxDQUFDaUcsOEJBQS9EO0FBQ0g7O0FBQ0R4SixJQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWNpSCxXQUFkLENBQTBCLFVBQTFCO0FBQ0gsR0F4WG1COztBQTBYcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSW5GLEVBQUFBLGdCQTlYb0IsNEJBOFhIa0MsUUE5WEcsRUE4WE07QUFDdEIsUUFBSUEsUUFBUSxDQUFDRCxNQUFULEtBQW9CLElBQXhCLEVBQThCO0FBQzFCLFVBQU1xRCxnQkFBZ0IsR0FBR3ZILGVBQWUsQ0FBQ0UsZUFBaEIsQ0FBZ0MyRyxJQUFoQyxrQ0FBK0QxQyxRQUFRLENBQUNnQixJQUFULENBQWNyRCxNQUE3RSxPQUF6QjtBQUNBOUIsTUFBQUEsZUFBZSxDQUFDNEosZUFBaEIsQ0FBZ0N6RixRQUFRLENBQUNnQixJQUFULENBQWMwRSxNQUE5QztBQUNBdEMsTUFBQUEsZ0JBQWdCLENBQUNNLEtBQWpCLENBQXVCLE1BQXZCO0FBQ0k3QixNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNidUIsUUFBQUEsZ0JBQWdCLENBQUNNLEtBQWpCLENBQXVCLE1BQXZCO0FBQ0gsT0FGUyxFQUVQLElBRk8sQ0FBVjtBQUdQLEtBUEQsTUFPTztBQUNIO0FBQ0EyQixNQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0J0RixRQUFRLENBQUN1RixRQUFULENBQWtCaEUsS0FBeEMsRUFBK0NoQyxlQUFlLENBQUNvRyx3QkFBL0Q7QUFDSDs7QUFDRDNKLElBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJpSCxXQUFqQixDQUE2QixVQUE3QjtBQUNILEdBM1ltQjs7QUE2WXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLG1CQWpab0IsK0JBaVpBbUMsR0FqWkEsRUFpWks7QUFDckIsUUFBSS9KLGVBQWUsQ0FBQ0MsUUFBaEIsS0FBNkIsSUFBakMsRUFBdUM7QUFDbkM7QUFDQUQsTUFBQUEsZUFBZSxDQUFDQyxRQUFoQixHQUEyQkUsQ0FBQyxDQUFDNkosU0FBRixDQUFZQyxpQkFBWixFQUErQixDQUFDLEdBQUQsQ0FBL0IsRUFBc0MsU0FBdEMsRUFBaUQsTUFBakQsQ0FBM0I7QUFDSDs7QUFDREYsSUFBQUEsR0FBRyxDQUFDRyxVQUFKLENBQWU7QUFDWEMsTUFBQUEsU0FBUyxFQUFFO0FBQ1BDLFFBQUFBLFdBQVcsRUFBRTtBQUNULGVBQUs7QUFDREMsWUFBQUEsU0FBUyxFQUFFLE9BRFY7QUFFREMsWUFBQUEsV0FBVyxFQUFFO0FBRlo7QUFESTtBQUROLE9BREE7QUFTWEMsTUFBQUEsS0FBSyxFQUFFLE9BVEk7QUFVWEMsTUFBQUEsT0FBTyxFQUFFLEdBVkU7QUFXWEMsTUFBQUEsSUFBSSxFQUFFekssZUFBZSxDQUFDQyxRQVhYO0FBWVh5SyxNQUFBQSxPQUFPLEVBQUU7QUFaRSxLQUFmO0FBY0gsR0FwYW1COztBQXFhcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSXJDLEVBQUFBLFdBemFvQix1QkF5YVJwQixJQXphUSxFQXlhRjtBQUNkakgsSUFBQUEsZUFBZSxDQUFDTyxTQUFoQixDQUEwQjRDLE1BQTFCLENBQWlDOEQsSUFBakMsRUFBdUNqRSxJQUF2QztBQUNBaEQsSUFBQUEsZUFBZSxDQUFDSSxhQUFoQixDQUE4QmdCLE9BQTlCLENBQXNDLEtBQXRDLEVBQTZDSSxRQUE3QyxDQUFzRCxTQUF0RDtBQUNILEdBNWFtQjs7QUE4YXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW9JLEVBQUFBLGVBbmJvQiwyQkFtYkplLE9BbmJJLEVBbWJLO0FBQ3JCLFFBQUl0SixNQUFNLENBQUN1SixlQUFQLElBQTBCQyxTQUFTLENBQUNDLFNBQXhDLEVBQW1EO0FBQy9DRCxNQUFBQSxTQUFTLENBQUNDLFNBQVYsQ0FBb0JDLFNBQXBCLENBQThCSixPQUE5QjtBQUNILEtBRkQsTUFFTztBQUNIM0ssTUFBQUEsZUFBZSxDQUFDZ0wsd0JBQWhCLENBQXlDTCxPQUF6QztBQUNIO0FBQ0osR0F6Ym1COztBQTBicEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsd0JBOWJvQixvQ0E4YktMLE9BOWJMLEVBOGJjO0FBQzlCLFFBQU1NLFFBQVEsR0FBR0MsUUFBUSxDQUFDQyxhQUFULENBQXVCLFVBQXZCLENBQWpCO0FBQ0FGLElBQUFBLFFBQVEsQ0FBQ3JILEtBQVQsR0FBZStHLE9BQWY7QUFDQU8sSUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWNDLFdBQWQsQ0FBMEJKLFFBQTFCO0FBQ0FBLElBQUFBLFFBQVEsQ0FBQzVHLEtBQVQ7QUFBaUI0RyxJQUFBQSxRQUFRLENBQUNLLE1BQVQ7O0FBQ2pCLFFBQUc7QUFDQ0osTUFBQUEsUUFBUSxDQUFDSyxXQUFULENBQXFCLE1BQXJCO0FBQ0gsS0FGRCxDQUVFLE9BQU1DLEdBQU4sRUFBVztBQUNUM0YsTUFBQUEsT0FBTyxDQUFDSCxLQUFSLENBQWMsNkJBQWQsRUFBNkM4RixHQUE3QztBQUNIOztBQUNETixJQUFBQSxRQUFRLENBQUNFLElBQVQsQ0FBY0ssV0FBZCxDQUEwQlIsUUFBMUI7QUFDSDtBQXpjbUIsQ0FBeEI7QUE0Y0E7QUFDQTtBQUNBOztBQUNBOUssQ0FBQyxDQUFDK0ssUUFBRCxDQUFELENBQVlRLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFMLEVBQUFBLGVBQWUsQ0FBQ1UsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2sgKi9cblxuXG4vKipcbiAqIFRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlIGhhbmRsZXMgdGhlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBleHRlbnNpb25zIGluZGV4IHBhZ2UuXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25zSW5kZXhcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0luZGV4ID0ge1xuICAgIG1hc2tMaXN0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zTGlzdDogJCgnI2V4dGVuc2lvbnMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiAkKCcjc2VhcmNoLWV4dGVuc2lvbnMtaW5wdXQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBUaW1lb3V0IHJlZmVyZW5jZSBmb3IgcmV0cnkgYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJldHJ5VGltZW91dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIG5lY2Vzc2FyeSBpbnRlcmFjdGl2aXR5IGFuZCBmZWF0dXJlcyBvbiB0aGUgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEhhbmRsZSBhdmF0YXJzIHdpdGggbWlzc2luZyBzcmNcbiAgICAgICAgJCgnLmF2YXRhcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cignc3JjJykgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXYuXG4gICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRvdWJsZS1jbGljayBiZWhhdmlvciBvbiB0aGUgZXh0ZW5zaW9uIHJvd3MuXG4gICAgICAgICQoJy5leHRlbnNpb24tcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2lkfWA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBkZWxldGUgZnVuY3Rpb25hbGl0eSBvbiBkZWxldGUgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBleHRlbnNpb24gSUQgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGRlbGV0ZSB0aGUgZXh0ZW5zaW9uIHJlY29yZC5cbiAgICAgICAgICAgIFBieEFwaS5FeHRlbnNpb25zRGVsZXRlUmVjb3JkKGV4dGVuc2lvbklkLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckRlbGV0ZVJlY29yZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBjb3B5IHNlY3JldCBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5jbGlwYm9hcmQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnZGl2LmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIG51bWJlciBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIFBieEFwaSBtZXRob2QgdG8gZ2V0IHRoZSBleHRlbnNpb24gc2VjcmV0LlxuICAgICAgICAgICAgU2lwQVBJLmdldFNlY3JldChudW1iZXIsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyR2V0U2VjcmV0KTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXNldCBkYXRhdGFibGUgc29ydHMgYW5kIHBhZ2VcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKS5zdGF0ZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyNyZXNldC1jYWNoZSc7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aD09PSdhdXRvJyl7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudFxuICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goe1xuICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogMCxcbiAgICAgICAgICAgIHNlYXJjaE9uRm9jdXM6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiBbJ3RpdGxlJ10sXG4gICAgICAgICAgICBzaG93Tm9SZXN1bHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUV4dGVuc2lvbiwgdmFsdWU6ICdudW1iZXI6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeU1vYmlsZSwgdmFsdWU6ICdtb2JpbGU6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUVtYWlsLCB2YWx1ZTogJ2VtYWlsOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlJRCwgdmFsdWU6ICdpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiB5b3UgY2xpY2sgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKCdxdWVyeScpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcblxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI3Jlc2V0LWNhY2hlXCIpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdEYXRhVGFibGVzX2V4dGVuc2lvbnMtdGFibGVfL2FkbWluLWNhYmluZXQvZXh0ZW5zaW9ucy9pbmRleC8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBzdGF0ZSBzYXZpbmcgdG8gYXV0b21hdGljYWxseSBzYXZlIGFuZCByZXN0b3JlIHRoZSB0YWJsZSdzIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAwfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDF9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAzLCAgdGFyZ2V0czogMn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDQsICB0YXJnZXRzOiAzfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNSwgIHRhcmdldHM6IDR9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogLTF9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc3BvbnNpdmU6IHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy51c2VybmFtZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQ0FTVChFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdtb2JpbGUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQ0FTVChFeHRlcm5hbEV4dGVuc2lvbnMubnVtYmVyIEFTIElOVEVHRVIpJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ1VzZXJzLmVtYWlsJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2J1dHRvbnMnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1sxLCAnYXNjJ11dLFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldE5ld1JlY29yZHNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdXBwcmVzcyB0aGUgZGVmYXVsdCBlcnJvciBhbGVydFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGF0YVRhYmxlIHJlcXVlc3QgZmFpbGVkLCB3aWxsIHJldHJ5IGluIDMgc2Vjb25kcycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHJldHJ5IHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHVwIHJldHJ5IGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gUHJldmVudCBkZWZhdWx0IGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHN0YXRlU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogcGFnZUxlbmd0aCxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgLy8gc2Nyb2xsZXI6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBFeHRlbnNpb25zIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXBsYXRlUm93ICA9ICAkKCcuZXh0ZW5zaW9uLXJvdy10cGwnKS5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYXZhdGFyID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hdmF0YXInKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmF0dHIoJ3NyYycsZGF0YS5hdmF0YXIpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYWZ0ZXIoZGF0YS51c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5udW1iZXInKS50ZXh0KGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm1vYmlsZSBpbnB1dCcpLmF0dHIoJ3ZhbHVlJywgZGF0YS5tb2JpbGUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuZW1haWwnKS50ZXh0KGRhdGEuZW1haWwpO1xuXG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnJlbW92ZUNsYXNzKCdzbWFsbCcpLmFkZENsYXNzKCd0aW55Jyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkZWRpdEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5lZGl0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCRlZGl0QnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGVkaXRCdXR0b24uYXR0cignaHJlZicsYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGEuaWR9YClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkY2xpcGJvYXJkQnV0dG9uIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyxkYXRhLm51bWJlcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtdmFsdWUnLCBkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJC5lYWNoKCQoJ3RkJywgJHRlbXBsYXRlUm93KSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbCgkKHZhbHVlKS5odG1sKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJCh2YWx1ZSkuYXR0cignY2xhc3MnKSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBmb3IgbW9iaWxlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVJbnB1dG1hc2soJCgnaW5wdXQubW9iaWxlLW51bWJlci1pbnB1dCcpKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcG9wdXBzLlxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBEaXNhYmxlIERhdGFUYWJsZXMgZXJyb3IgYWxlcnRzIGNvbXBsZXRlbHlcbiAgICAgICAgICAgIGZuSW5pdENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBPdmVycmlkZSBEYXRhVGFibGVzIGVycm9yIGV2ZW50IGhhbmRsZXJcbiAgICAgICAgICAgICAgICAkLmZuLmRhdGFUYWJsZS5leHQuZXJyTW9kZSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJyxzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZSA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXG4gICAgICAgIGNvbnN0IHN0YXRlID0gZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHN0YXRlLnNlYXJjaC5zZWFyY2gpOyAvLyBTZXQgdGhlIHNlYXJjaCBmaWVsZCB3aXRoIHRoZSBzYXZlZCB2YWx1ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiAnc2VhcmNoJyBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IGV4dGVuc2lvbnNJbmRleC5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcblxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcihzZWFyY2hWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciB0byByZXRyaWV2ZS5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICAgICAqL1xuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDM5MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBkZWxldGluZyBhIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWxldGVkIGV4dGVuc2lvbidzIHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgdHJbaWQ9JHtyZXNwb25zZS5kYXRhLmlkfV1gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBkYXRhIGNoYW5nZS5cbiAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZGVsZXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBjZXQgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0U2VjcmV0KHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgYS5jbGlwYm9hcmRbZGF0YS12YWx1ZT0ke3Jlc3BvbnNlLmRhdGEubnVtYmVyfV1gKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5jb3B5VG9DbGlwYm9hcmQocmVzcG9uc2UuZGF0YS5zZWNyZXQpO1xuICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZ2V0IHNlY3JldCB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9HZXRTZWNyZXQpO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuY2xpcGJvYXJkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGlucHV0IG1hc2tzIGZvciB2aXN1YWxpemluZyBmb3JtYXR0ZWQgbnVtYmVycy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0gVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IHRvIGluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0bWFzaygkZWwpIHtcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gUHJlcGFyZXMgdGhlIHRhYmxlIGZvciBzb3J0XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgfVxuICAgICAgICAkZWwuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBleHRlbnNpb25zSW5kZXgubWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHRleHQgcGFzc2VkIGFzIHBhcmFtIHRvIHRoZSBzeXN0ZW0gY2xpcGJvYXJkXG4gICAgICogQ2hlY2sgaWYgdXNpbmcgSFRUUFMgYW5kIG5hdmlnYXRvci5jbGlwYm9hcmQgaXMgYXZhaWxhYmxlXG4gICAgICogVGhlbiB1c2VzIHN0YW5kYXJkIGNsaXBib2FyZCBBUEksIG90aGVyd2lzZSB1c2VzIGZhbGxiYWNrXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5pc1NlY3VyZUNvbnRleHQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBQdXQgdGV4dCB2YXJpYWJsZSBpbnRvIGNsaXBib2FyZCBmb3IgdW5zZWN1cmVkIGNvbm5lY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnQgLSBUaGUgdGV4dCB2YWx1ZS5cbiAgICAgKi9cbiAgICB1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBjb25zdCB0ZXh0QXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICAgICAgdGV4dEFyZWEudmFsdWU9Y29udGVudDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgIHRleHRBcmVhLmZvY3VzKCk7dGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5JylcbiAgICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBjb3B5IHRvIGNsaXBib2FyZCcsIGVycilcbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlcyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=