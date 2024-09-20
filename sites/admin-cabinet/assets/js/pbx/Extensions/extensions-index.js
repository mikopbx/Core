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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwiJGJvZHkiLCJpbml0aWFsaXplIiwiZWFjaCIsImF0dHIiLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiZXh0ZW5zaW9uSWQiLCJyZW1vdmUiLCJQYnhBcGkiLCJFeHRlbnNpb25zRGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsIm51bWJlciIsIlNpcEFQSSIsImdldFNlY3JldCIsImNiQWZ0ZXJHZXRTZWNyZXQiLCJEYXRhVGFibGUiLCJzdGF0ZSIsImNsZWFyIiwiaGFzaCIsInJlbG9hZCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJkYXRhIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwic2Nyb2xsQ29sbGFwc2UiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsIiR0ZW1wbGF0ZVJvdyIsImNsb25lIiwiJGF2YXRhciIsImZpbmQiLCJhdmF0YXIiLCJhZnRlciIsInVzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsImVtYWlsIiwicmVtb3ZlQ2xhc3MiLCIkZWRpdEJ1dHRvbiIsInVuZGVmaW5lZCIsIiRjbGlwYm9hcmRCdXR0b24iLCJpbmRleCIsImVxIiwiaHRtbCIsImRyYXdDYWxsYmFjayIsImluaXRpYWxpemVJbnB1dG1hc2siLCJwb3B1cCIsInNlYXJjaERlYm91bmNlVGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwia2V5Q29kZSIsImxlbmd0aCIsImFwcGx5RmlsdGVyIiwibG9hZGVkIiwic2VhcmNoVmFsdWUiLCJnZXRRdWVyeVBhcmFtIiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwiY29weVRvQ2xpcGJvYXJkIiwic2VjcmV0IiwiZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0IiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiY29udGVudCIsImlzU2VjdXJlQ29udGV4dCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInVuc2VjdXJlZENvcHlUb0NsaXBib2FyZCIsInRleHRBcmVhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiYm9keSIsImFwcGVuZENoaWxkIiwic2VsZWN0IiwiZXhlY0NvbW1hbmQiLCJlcnIiLCJjb25zb2xlIiwicmVtb3ZlQ2hpbGQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNBO0FBQ0E7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OztBQUNBckssQ0FBQyxDQUFDc0ssUUFBRCxDQUFELENBQVlTLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxMLEVBQUFBLGVBQWUsQ0FBQ1MsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2sgKi9cblxuXG4vKipcbiAqIFRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlIGhhbmRsZXMgdGhlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBleHRlbnNpb25zIGluZGV4IHBhZ2UuXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25zSW5kZXhcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0luZGV4ID0ge1xuICAgIG1hc2tMaXN0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zTGlzdDogJCgnI2V4dGVuc2lvbnMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhZ2VMZW5ndGhTZWxlY3RvcjokKCcjcGFnZS1sZW5ndGgtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiAkKCcjc2VhcmNoLWV4dGVuc2lvbnMtaW5wdXQnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkYXRhIHRhYmxlIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZG9jdW1lbnQgYm9keS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRib2R5OiAkKCdib2R5JyksXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUuXG4gICAgICogU2V0cyB1cCBuZWNlc3NhcnkgaW50ZXJhY3Rpdml0eSBhbmQgZmVhdHVyZXMgb24gdGhlIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBIYW5kbGUgYXZhdGFycyB3aXRoIG1pc3Npbmcgc3JjXG4gICAgICAgICQoJy5hdmF0YXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3NyYycpID09PSAnJykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gTW92ZSB0aGUgXCJBZGQgTmV3XCIgYnV0dG9uIHRvIHRoZSBmaXJzdCBlaWdodC1jb2x1bW4gZGl2LlxuICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXG4gICAgICAgIC8vIFNldCB1cCBkb3VibGUtY2xpY2sgYmVoYXZpb3Igb24gdGhlIGV4dGVuc2lvbiByb3dzLlxuICAgICAgICAkKCcuZXh0ZW5zaW9uLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtpZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBkZWxldGUgdGhlIGV4dGVuc2lvbiByZWNvcmQuXG4gICAgICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChleHRlbnNpb25JZCwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJEZWxldGVSZWNvcmQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgY29weSBzZWNyZXQgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuY2xpcGJvYXJkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2Rpdi5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGdldCB0aGUgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgICAgICAgIFNpcEFQSS5nZXRTZWNyZXQobnVtYmVyLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckdldFNlY3JldCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzZXQgZGF0YXRhYmxlIHNvcnRzIGFuZCBwYWdlXG4gICAgICAgICQoYGFbaHJlZj0nJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11gKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCkuc3RhdGUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcjcmVzZXQtY2FjaGUnO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnRcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFeHRlbnNpb24sIHZhbHVlOiAnbnVtYmVyOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlNb2JpbGUsIHZhbHVlOiAnbW9iaWxlOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFbWFpbCwgdmFsdWU6ICdlbWFpbDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5SUQsIHZhbHVlOiAnaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSBcIiNyZXNldC1jYWNoZVwiKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnRGF0YVRhYmxlc19leHRlbnNpb25zLXRhYmxlXy9hZG1pbi1jYWJpbmV0L2V4dGVuc2lvbnMvaW5kZXgvJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBjb25zdCBwYWdlTGVuZ3RoID0gc2F2ZWRQYWdlTGVuZ3RoID8gc2F2ZWRQYWdlTGVuZ3RoIDogZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSh7XG4gICAgICAgICAgICAvLyBFbmFibGUgc3RhdGUgc2F2aW5nIHRvIGF1dG9tYXRpY2FsbHkgc2F2ZSBhbmQgcmVzdG9yZSB0aGUgdGFibGUncyBzdGF0ZVxuICAgICAgICAgICAgc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAxfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMywgIHRhcmdldHM6IDJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA0LCAgdGFyZ2V0czogM30sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDUsICB0YXJnZXRzOiA0fSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IC0xfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XG4gICAgICAgICAgICAgICAgZGV0YWlsczogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnVXNlcnMudXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZW5zaW9ucy5udW1iZXIgQVMgSU5URUdFUiknLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0NBU1QoRXh0ZXJuYWxFeHRlbnNpb25zLm51bWJlciBBUyBJTlRFR0VSKScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdVc2Vycy5lbWFpbCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXROZXdSZWNvcmRzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy8gc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcGxhdGVSb3cgID0gICQoJy5leHRlbnNpb24tcm93LXRwbCcpLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhdmF0YXIgPSAkdGVtcGxhdGVSb3cuZmluZCgnLmF2YXRhcicpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYXR0cignc3JjJyxkYXRhLmF2YXRhcik7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hZnRlcihkYXRhLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm51bWJlcicpLnRleHQoZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubW9iaWxlIGlucHV0JykuYXR0cigndmFsdWUnLCBkYXRhLm1vYmlsZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5lbWFpbCcpLnRleHQoZGF0YS5lbWFpbCk7XG5cbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucmVtb3ZlQ2xhc3MoJ3NtYWxsJykuYWRkQ2xhc3MoJ3RpbnknKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0ICRlZGl0QnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmVkaXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVkaXRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkZWRpdEJ1dHRvbi5hdHRyKCdocmVmJyxgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YS5pZH1gKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRjbGlwYm9hcmRCdXR0b24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnLGRhdGEubnVtYmVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkLmVhY2goJCgndGQnLCAkdGVtcGxhdGVSb3cpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcShpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKCQodmFsdWUpLmh0bWwoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygkKHZhbHVlKS5hdHRyKCdjbGFzcycpKVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIGZvciBtb2JpbGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJyxzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZSA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXG4gICAgICAgIGNvbnN0IHN0YXRlID0gZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHN0YXRlLnNlYXJjaC5zZWFyY2gpOyAvLyBTZXQgdGhlIHNlYXJjaCBmaWVsZCB3aXRoIHRoZSBzYXZlZCB2YWx1ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiAnc2VhcmNoJyBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IGV4dGVuc2lvbnNJbmRleC5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcblxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcihzZWFyY2hWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciB0byByZXRyaWV2ZS5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICAgICAqL1xuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDM5MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBkZWxldGluZyBhIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWxldGVkIGV4dGVuc2lvbidzIHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgdHJbaWQ9JHtyZXNwb25zZS5kYXRhLmlkfV1gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBkYXRhIGNoYW5nZS5cbiAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZGVsZXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBjZXQgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0U2VjcmV0KHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgYS5jbGlwYm9hcmRbZGF0YS12YWx1ZT0ke3Jlc3BvbnNlLmRhdGEubnVtYmVyfV1gKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5jb3B5VG9DbGlwYm9hcmQocmVzcG9uc2UuZGF0YS5zZWNyZXQpO1xuICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZ2V0IHNlY3JldCB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9HZXRTZWNyZXQpO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuY2xpcGJvYXJkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGlucHV0IG1hc2tzIGZvciB2aXN1YWxpemluZyBmb3JtYXR0ZWQgbnVtYmVycy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0gVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IHRvIGluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0bWFzaygkZWwpIHtcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gUHJlcGFyZXMgdGhlIHRhYmxlIGZvciBzb3J0XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgfVxuICAgICAgICAkZWwuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBleHRlbnNpb25zSW5kZXgubWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHRleHQgcGFzc2VkIGFzIHBhcmFtIHRvIHRoZSBzeXN0ZW0gY2xpcGJvYXJkXG4gICAgICogQ2hlY2sgaWYgdXNpbmcgSFRUUFMgYW5kIG5hdmlnYXRvci5jbGlwYm9hcmQgaXMgYXZhaWxhYmxlXG4gICAgICogVGhlbiB1c2VzIHN0YW5kYXJkIGNsaXBib2FyZCBBUEksIG90aGVyd2lzZSB1c2VzIGZhbGxiYWNrXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5pc1NlY3VyZUNvbnRleHQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBQdXQgdGV4dCB2YXJpYWJsZSBpbnRvIGNsaXBib2FyZCBmb3IgdW5zZWN1cmVkIGNvbm5lY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnQgLSBUaGUgdGV4dCB2YWx1ZS5cbiAgICAgKi9cbiAgICB1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBjb25zdCB0ZXh0QXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICAgICAgdGV4dEFyZWEudmFsdWU9Y29udGVudDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgIHRleHRBcmVhLmZvY3VzKCk7dGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5JylcbiAgICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBjb3B5IHRvIGNsaXBib2FyZCcsIGVycilcbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgIH0sXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlcyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=