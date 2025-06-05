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
        }); // Initialize the extension status worker.

        extensionsStatusLoopWorker.initialize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwicmV0cnlUaW1lb3V0IiwiJGJvZHkiLCJpbml0aWFsaXplIiwiZWFjaCIsImF0dHIiLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiZXh0ZW5zaW9uSWQiLCJyZW1vdmUiLCJQYnhBcGkiLCJFeHRlbnNpb25zRGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsIm51bWJlciIsIlNpcEFQSSIsImdldFNlY3JldCIsImNiQWZ0ZXJHZXRTZWNyZXQiLCJEYXRhVGFibGUiLCJzdGF0ZSIsImNsZWFyIiwiaGFzaCIsInJlbG9hZCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY29uc29sZSIsImxvZyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJzY3JvbGxDb2xsYXBzZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiJHRlbXBsYXRlUm93IiwiY2xvbmUiLCIkYXZhdGFyIiwiZmluZCIsImF2YXRhciIsImFmdGVyIiwidXNlcm5hbWUiLCJ0ZXh0IiwibW9iaWxlIiwiZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiJGNsaXBib2FyZEJ1dHRvbiIsImluZGV4IiwiZXEiLCJodG1sIiwiZHJhd0NhbGxiYWNrIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsInBvcHVwIiwiZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIiLCJmbkluaXRDb21wbGV0ZSIsImZuIiwiZXh0IiwiZXJyTW9kZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJrZXlDb2RlIiwibGVuZ3RoIiwiYXBwbHlGaWx0ZXIiLCJsb2FkZWQiLCJzZWFyY2hWYWx1ZSIsImdldFF1ZXJ5UGFyYW0iLCJwYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImdldCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwiY29weVRvQ2xpcGJvYXJkIiwic2VjcmV0IiwiZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0IiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiY29udGVudCIsImlzU2VjdXJlQ29udGV4dCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInVuc2VjdXJlZENvcHlUb0NsaXBib2FyZCIsInRleHRBcmVhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiYm9keSIsImFwcGVuZENoaWxkIiwic2VsZWN0IiwiZXhlY0NvbW1hbmQiLCJlcnIiLCJyZW1vdmVDaGlsZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsUUFBUSxFQUFFLElBRFU7O0FBR3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRUMsQ0FBQyxDQUFDLG1CQUFELENBUEU7O0FBU3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxD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UEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTaXBBUEksIFNlbWFudGljTG9jYWxpemF0aW9uLCBJbnB1dE1hc2tQYXR0ZXJucywgVXNlck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZSwgSW5wdXRtYXNrICovXG5cblxuLyoqXG4gKiBUaGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZSBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9ucyBpbmRleCBwYWdlLlxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0luZGV4XG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNJbmRleCA9IHtcbiAgICBtYXNrTGlzdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6ICQoJyNleHRlbnNpb25zLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogVGltZW91dCByZWZlcmVuY2UgZm9yIHJldHJ5IGF0dGVtcHRzXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICByZXRyeVRpbWVvdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRib2R5OiAkKCdib2R5JyksXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUuXG4gICAgICogU2V0cyB1cCBuZWNlc3NhcnkgaW50ZXJhY3Rpdml0eSBhbmQgZmVhdHVyZXMgb24gdGhlIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBIYW5kbGUgYXZhdGFycyB3aXRoIG1pc3Npbmcgc3JjXG4gICAgICAgICQoJy5hdmF0YXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3NyYycpID09PSAnJykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gTW92ZSB0aGUgXCJBZGQgTmV3XCIgYnV0dG9uIHRvIHRoZSBmaXJzdCBlaWdodC1jb2x1bW4gZGl2LlxuICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXG4gICAgICAgIC8vIFNldCB1cCBkb3VibGUtY2xpY2sgYmVoYXZpb3Igb24gdGhlIGV4dGVuc2lvbiByb3dzLlxuICAgICAgICAkKCcuZXh0ZW5zaW9uLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtpZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBkZWxldGUgdGhlIGV4dGVuc2lvbiByZWNvcmQuXG4gICAgICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChleHRlbnNpb25JZCwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJEZWxldGVSZWNvcmQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgY29weSBzZWNyZXQgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuY2xpcGJvYXJkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2Rpdi5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGdldCB0aGUgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgICAgICAgIFNpcEFQSS5nZXRTZWNyZXQobnVtYmVyLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckdldFNlY3JldCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzZXQgZGF0YXRhYmxlIHNvcnRzIGFuZCBwYWdlXG4gICAgICAgICQoYGFbaHJlZj0nJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11gKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCkuc3RhdGUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcjcmVzZXQtY2FjaGUnO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnRcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFeHRlbnNpb24sIHZhbHVlOiAnbnVtYmVyOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlNb2JpbGUsIHZhbHVlOiAnbW9iaWxlOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFbWFpbCwgdmFsdWU6ICdlbWFpbDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5SUQsIHZhbHVlOiAnaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSBcIiNyZXNldC1jYWNoZVwiKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnRGF0YVRhYmxlc19leHRlbnNpb25zLXRhYmxlXy9hZG1pbi1jYWJpbmV0L2V4dGVuc2lvbnMvaW5kZXgvJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBjb25zdCBwYWdlTGVuZ3RoID0gc2F2ZWRQYWdlTGVuZ3RoID8gc2F2ZWRQYWdlTGVuZ3RoIDogZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSh7XG4gICAgICAgICAgICAvLyBFbmFibGUgc3RhdGUgc2F2aW5nIHRvIGF1dG9tYXRpY2FsbHkgc2F2ZSBhbmQgcmVzdG9yZSB0aGUgdGFibGUncyBzdGF0ZVxuICAgICAgICAgICAgc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAxfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMywgIHRhcmdldHM6IDJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA0LCAgdGFyZ2V0czogM30sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDUsICB0YXJnZXRzOiA0fSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IC0xfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XG4gICAgICAgICAgICAgICAgZGV0YWlsczogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnVXNlcnMudXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZW5zaW9ucy5udW1iZXIgQVMgSU5URUdFUiknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZXJuYWxFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy5lbWFpbCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKHhociwgdGV4dFN0YXR1cywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VwcHJlc3MgdGhlIGRlZmF1bHQgZXJyb3IgYWxlcnRcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RhdGFUYWJsZSByZXF1ZXN0IGZhaWxlZCwgd2lsbCByZXRyeSBpbiAzIHNlY29uZHMnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyByZXRyeSB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB1cCByZXRyeSBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFByZXZlbnQgZGVmYXVsdCBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHNjcm9sbGVyOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgRXh0ZW5zaW9ucyByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZW1wbGF0ZVJvdyAgPSAgJCgnLmV4dGVuc2lvbi1yb3ctdHBsJykuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGF2YXRhciA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYXZhdGFyJyk7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hdHRyKCdzcmMnLGRhdGEuYXZhdGFyKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmFmdGVyKGRhdGEudXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubnVtYmVyJykudGV4dChkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5tb2JpbGUgaW5wdXQnKS5hdHRyKCd2YWx1ZScsIGRhdGEubW9iaWxlKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmVtYWlsJykudGV4dChkYXRhLmVtYWlsKTtcblxuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5yZW1vdmVDbGFzcygnc21hbGwnKS5hZGRDbGFzcygndGlueScpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgJGVkaXRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uZWRpdCcpO1xuICAgICAgICAgICAgICAgIGlmICgkZWRpdEJ1dHRvbiE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRlZGl0QnV0dG9uLmF0dHIoJ2hyZWYnLGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtkYXRhLmlkfWApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGNsaXBib2FyZEJ1dHRvbiE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24uYXR0cignZGF0YS12YWx1ZScsZGF0YS5udW1iZXIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXZhbHVlJywgZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICQuZWFjaCgkKCd0ZCcsICR0ZW1wbGF0ZVJvdyksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKGluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoJCh2YWx1ZSkuaHRtbCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCQodmFsdWUpLmF0dHIoJ2NsYXNzJykpXG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgZm9yIG1vYmlsZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplSW5wdXRtYXNrKCQoJ2lucHV0Lm1vYmlsZS1udW1iZXItaW5wdXQnKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHVwIHBvcHVwcy5cbiAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIHdvcmtlci5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gRGlzYWJsZSBEYXRhVGFibGVzIGVycm9yIGFsZXJ0cyBjb21wbGV0ZWx5XG4gICAgICAgICAgICBmbkluaXRDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRGF0YVRhYmxlcyBlcnJvciBldmVudCBoYW5kbGVyXG4gICAgICAgICAgICAgICAgJC5mbi5kYXRhVGFibGUuZXh0LmVyck1vZGUgPSAnbm9uZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBzYXZlZCBzZWFyY2ggcGhyYXNlIGZyb20gRGF0YVRhYmxlcyBzdGF0ZVxuICAgICAgICBjb25zdCBzdGF0ZSA9IGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSBleHRlbnNpb25zSW5kZXguZ2V0UXVlcnlQYXJhbSgnc2VhcmNoJyk7XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCB2YWx1ZSBhbmQgYXBwbGllcyB0aGUgZmlsdGVyIGlmIGEgc2VhcmNoIHZhbHVlIGlzIHByb3ZpZGVkLlxuICAgICAgICBpZiAoc2VhcmNoVmFsdWUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXG4gICAgICogQHJldHVybiB7c3RyaW5nfG51bGx9IFRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyLCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICAgKi9cbiAgICBnZXRRdWVyeVBhcmFtKHBhcmFtKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHJldHVybiB1cmxQYXJhbXMuZ2V0KHBhcmFtKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSAzOTA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZGVsZXRpbmcgYSByZWNvcmQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVsZXRlZCBleHRlbnNpb24ncyB0YWJsZSByb3cuXG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYHRyW2lkPSR7cmVzcG9uc2UuZGF0YS5pZH1dYCkucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UuXG4gICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgY2V0IGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckdldFNlY3JldChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYGEuY2xpcGJvYXJkW2RhdGEtdmFsdWU9JHtyZXNwb25zZS5kYXRhLm51bWJlcn1dYCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguY29weVRvQ2xpcGJvYXJkKHJlc3BvbnNlLmRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGdldCBzZWNyZXQgd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSB0ZXh0IHBhc3NlZCBhcyBwYXJhbSB0byB0aGUgc3lzdGVtIGNsaXBib2FyZFxuICAgICAqIENoZWNrIGlmIHVzaW5nIEhUVFBTIGFuZCBuYXZpZ2F0b3IuY2xpcGJvYXJkIGlzIGF2YWlsYWJsZVxuICAgICAqIFRoZW4gdXNlcyBzdGFuZGFyZCBjbGlwYm9hcmQgQVBJLCBvdGhlcndpc2UgdXNlcyBmYWxsYmFja1xuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGlmICh3aW5kb3cuaXNTZWN1cmVDb250ZXh0ICYmIG5hdmlnYXRvci5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogUHV0IHRleHQgdmFyaWFibGUgaW50byBjbGlwYm9hcmQgZm9yIHVuc2VjdXJlZCBjb25uZWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gVGhlIHRleHQgdmFsdWUuXG4gICAgICovXG4gICAgdW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHRleHRBcmVhLnZhbHVlPWNvbnRlbnQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB0ZXh0QXJlYS5mb2N1cygpO3RleHRBcmVhLnNlbGVjdCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29weSB0byBjbGlwYm9hcmQnLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICB9LFxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFbXBsb3llZXMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19