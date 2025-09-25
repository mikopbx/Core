"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, SipAPI, SemanticLocalization, InputMaskPatterns, UserMessage, globalTranslate, Inputmask, ExtensionIndexStatusMonitor, ExtensionsAPI, EmployeesAPI */

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
   * Draw counter for DataTables draw parameter
   * @type {number}
   */
  drawCounter: 1,

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

    extensionsIndex.initializeDataTable(); // Initialize the bulk actions dropdown

    $('#bulk-actions-dropdown').dropdown(); // Set up double-click behavior on the extension rows using delegation for dynamic content.
    // Exclude buttons column to prevent accidental navigation when trying to delete

    extensionsIndex.$body.on('dblclick', '.extension-row td:not(:last-child)', function (e) {
      var extensionId = $(e.target).closest('tr').attr('data-extension-id');
      window.location = "".concat(globalRootUrl, "extensions/modify/").concat(extensionId);
    }); // Set up delete functionality on delete button click.

    extensionsIndex.$body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      $(e.target).addClass('disabled'); // Get the database extension ID from the closest table row.

      var extensionId = $(e.target).closest('tr').attr('data-extension-id'); // Remove any previous AJAX messages.

      $('.message.ajax').remove(); // Call the EmployeesAPI method to delete the employee record.

      EmployeesAPI.deleteRecord(extensionId, extensionsIndex.cbAfterDeleteRecord);
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
        data: null,
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable,

      }, {
        name: 'username',
        data: 'user_username'
      }, {
        name: 'number',
        data: 'number'
      }, {
        name: 'mobile',
        data: 'mobile'
      }, {
        name: 'email',
        data: 'user_email'
      }, {
        name: 'buttons',
        data: null,
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable

      }],
      order: [[1, 'asc']],
      serverSide: true,
      processing: false,
      ajax: {
        url: "/pbxcore/api/v3/employees",
        type: 'GET',
        data: function data(d) {
          // Increment draw counter for this request
          extensionsIndex.drawCounter = d.draw || ++extensionsIndex.drawCounter; // Transform DataTables request to our REST API format (query params for GET)

          var requestData = {
            search: d.search.value,
            limit: d.length,
            offset: d.start
          }; // Add sorting information

          if (d.order && d.order.length > 0) {
            var orderColumn = d.columns[d.order[0].column];

            if (orderColumn && orderColumn.name) {
              requestData.order_by = orderColumn.name;
              requestData.order_direction = d.order[0].dir.toUpperCase();
            }
          }

          return requestData;
        },
        dataSrc: function dataSrc(json) {
          var _json$data, _json$data2, _json$data3;

          // Handle pagination format from Employees API
          // API returns: {data: {data: [...], recordsTotal: n, recordsFiltered: n}}
          // Extract data and pagination info from the response
          var data = ((_json$data = json.data) === null || _json$data === void 0 ? void 0 : _json$data.data) || [];
          var recordsTotal = ((_json$data2 = json.data) === null || _json$data2 === void 0 ? void 0 : _json$data2.recordsTotal) || 0;
          var recordsFiltered = ((_json$data3 = json.data) === null || _json$data3 === void 0 ? void 0 : _json$data3.recordsFiltered) || recordsTotal; // Set DataTables pagination info on the response object

          json.draw = extensionsIndex.drawCounter;
          json.recordsTotal = recordsTotal;
          json.recordsFiltered = recordsFiltered; // Return just the data array for DataTables to process

          return data;
        },
        error: function error(xhr, textStatus, _error) {
          // Suppress the default error alert
          // Clear any existing retry timeout
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
      language: _objectSpread(_objectSpread({}, SemanticLocalization.dataTableLocalisation), {}, {
        emptyTable: ' ',
        // Empty string to hide default message
        zeroRecords: ' ' // Empty string to hide default message

      }),

      /**
       * Constructs the Extensions row.
       * @param {HTMLElement} row - The row element.
       * @param {Array} data - The row data.
       */
      createdRow: function createdRow(row, data) {
        var $templateRow = $('.extension-row-tpl').clone(true);
        var $avatar = $templateRow.find('.avatar');
        $avatar.attr('src', data.avatar);
        $avatar.after(data.user_username);
        $templateRow.find('.number').text(data.number);
        $templateRow.find('.mobile input').attr('value', data.mobile);
        $templateRow.find('.email').text(data.user_email);
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
        $(row).attr('id', data.number); // Use extension number as ID for status monitor

        $(row).attr('data-extension-id', data.id); // Preserve database ID as data attribute

        $(row).addClass('extension-row'); // Add class for status monitor
        // Apply disabled class if extension is disabled

        if (data.disabled) {
          $(row).addClass('disabled');
        } // Apply cached status immediately if available


        if (typeof ExtensionIndexStatusMonitor !== 'undefined' && ExtensionIndexStatusMonitor.statusCache) {
          var cachedStatus = ExtensionIndexStatusMonitor.statusCache[data.number];

          if (cachedStatus) {
            // Status is available in cache, apply it immediately
            var statusColor = ExtensionIndexStatusMonitor.getColorForStatus(cachedStatus.status);
            var $statusCell = $(row).find('.extension-status');

            if ($statusCell.length) {
              var statusHtml = "\n                                <div class=\"ui ".concat(statusColor, " empty circular label\" \n                                     style=\"width: 1px;height: 1px;\"\n                                     title=\"Extension ").concat(data.number, ": ").concat(cachedStatus.status, "\">\n                                </div>\n                            ");
              $statusCell.html(statusHtml);
            }
          }
        }

        $.each($('td', $templateRow), function (index, value) {
          $('td', row).eq(index).html($(value).html()).addClass($(value).attr('class'));
        });
      },

      /**
       * Draw event - fired once the table has completed a draw.
       */
      drawCallback: function drawCallback(settings) {
        // Initialize the input mask for mobile numbers.
        extensionsIndex.initializeInputmask($('input.mobile-number-input')); // Check if table is empty and show appropriate message

        var api = new $.fn.dataTable.Api(settings);
        var pageInfo = api.page.info();
        var hasRecords = pageInfo.recordsDisplay > 0;
        var searchValue = api.search();

        if (!hasRecords) {
          $('#extensions-table').hide(); // Check if this is due to search filter or truly empty database

          if (searchValue && searchValue.trim() !== '') {
            // Show "Nothing found" message for search results
            extensionsIndex.showNoSearchResultsMessage();
          } else {
            // Show "Add first employee" placeholder for empty database
            $('#extensions-table-container').hide();
            $('#extensions-placeholder').show(); // Initialize dropdown in the placeholder

            $('#extensions-placeholder .dropdown').dropdown();
          }
        } else {
          $('#extensions-table').show();
          $('#extensions-table-container').show();
          $('#extensions-placeholder').hide();
          extensionsIndex.hideNoSearchResultsMessage(); // Apply cached statuses to newly rendered rows

          if (typeof ExtensionIndexStatusMonitor !== 'undefined') {
            // Refresh DOM cache for new rows
            ExtensionIndexStatusMonitor.refreshCache(); // Apply cached statuses immediately

            ExtensionIndexStatusMonitor.applyStatusesToVisibleRows(); // Request statuses for any new extensions not in cache

            ExtensionIndexStatusMonitor.requestStatusesForNewExtensions();
          }
        } // Hide pagination when there are few records (less than page length)


        extensionsIndex.togglePaginationVisibility(pageInfo); // Set up popups.

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
    } // Initialize extension index status monitor if available


    if (typeof ExtensionIndexStatusMonitor !== 'undefined') {
      ExtensionIndexStatusMonitor.initialize(); // Request initial status after table loads

      setTimeout(function () {
        extensionsIndex.requestInitialStatus();
      }, 500);
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
      // Reload the datatable to reflect changes
      extensionsIndex.dataTable.ajax.reload(null, false); // Call the callback function for data change if it exists.

      if (typeof Extensions !== 'undefined' && typeof Extensions.cbOnDataChanged === 'function') {
        Extensions.cbOnDataChanged();
      }
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
   * Shows "No search results found" message
   */
  showNoSearchResultsMessage: function showNoSearchResultsMessage() {
    // Remove any existing no-results message
    extensionsIndex.hideNoSearchResultsMessage(); // Create and show no results message

    var noResultsHtml = "\n            <div id=\"no-search-results\" style=\"margin-top: 2em;\">\n                <div class=\"ui icon message\">\n                    <i class=\"search icon\"></i>\n                    <div class=\"content\">\n                        <div class=\"header\">".concat(globalTranslate.ex_NoSearchResults, "</div>\n                        <p>").concat(globalTranslate.ex_TryDifferentKeywords, "</p>\n                    </div>\n                </div>\n            </div>\n        ");
    $('#extensions-table-container').after(noResultsHtml);
  },

  /**
   * Hides "No search results found" message
   */
  hideNoSearchResultsMessage: function hideNoSearchResultsMessage() {
    $('#no-search-results').remove();
  },

  /**
   * Toggles pagination visibility based on number of records
   * Hides pagination when there are fewer records than the page length
   * @param {Object} pageInfo - DataTables page info object
   */
  togglePaginationVisibility: function togglePaginationVisibility(pageInfo) {
    var paginationWrapper = $('#extensions-table_paginate');
    var paginationInfo = $('#extensions-table_info'); // Hide pagination if total records fit on one page

    if (pageInfo.recordsDisplay <= pageInfo.length) {
      paginationWrapper.hide();
      paginationInfo.hide();
    } else {
      paginationWrapper.show();
      paginationInfo.show();
    }
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
  },

  /**
   * Request initial extension status on page load
   */
  requestInitialStatus: function requestInitialStatus() {
    if (typeof SipAPI !== 'undefined') {
      // Use simplified mode for index page - pass options as first param, callback as second
      SipAPI.getStatuses({
        simplified: true
      }, function (response) {
        // Manually trigger status update
        if (response && response.data && typeof ExtensionIndexStatusMonitor !== 'undefined') {
          ExtensionIndexStatusMonitor.updateAllExtensionStatuses(response.data);
        }
      });
    }
  }
};
/**
 *  Initialize Employees table on document ready
 */

$(document).ready(function () {
  extensionsIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwiZHJhd0NvdW50ZXIiLCJyZXRyeVRpbWVvdXQiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZHJvcGRvd24iLCJvbiIsImUiLCJleHRlbnNpb25JZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJyZW1vdmUiLCJFbXBsb3llZXNBUEkiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInJlcXVlc3REYXRhIiwibGltaXQiLCJsZW5ndGgiLCJvZmZzZXQiLCJzdGFydCIsIm9yZGVyQ29sdW1uIiwiY29sdW1uIiwib3JkZXJfYnkiLCJvcmRlcl9kaXJlY3Rpb24iLCJkaXIiLCJ0b1VwcGVyQ2FzZSIsImRhdGFTcmMiLCJqc29uIiwicmVjb3Jkc1RvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInNjcm9sbENvbGxhcHNlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCIkdGVtcGxhdGVSb3ciLCJjbG9uZSIsIiRhdmF0YXIiLCJmaW5kIiwiYXZhdGFyIiwiYWZ0ZXIiLCJ1c2VyX3VzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsInVzZXJfZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiaWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiZGlzYWJsZWQiLCJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJzdGF0dXNDYWNoZSIsImNhY2hlZFN0YXR1cyIsInN0YXR1c0NvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzQ2VsbCIsInN0YXR1c0h0bWwiLCJodG1sIiwiaW5kZXgiLCJlcSIsImRyYXdDYWxsYmFjayIsInNldHRpbmdzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsImFwaSIsImZuIiwiQXBpIiwicGFnZUluZm8iLCJpbmZvIiwiaGFzUmVjb3JkcyIsInJlY29yZHNEaXNwbGF5Iiwic2VhcmNoVmFsdWUiLCJoaWRlIiwidHJpbSIsInNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwic2hvdyIsImhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwicmVmcmVzaENhY2hlIiwiYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MiLCJyZXF1ZXN0U3RhdHVzZXNGb3JOZXdFeHRlbnNpb25zIiwidG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkiLCJwb3B1cCIsImZuSW5pdENvbXBsZXRlIiwiZXh0IiwiZXJyTW9kZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJrZXlDb2RlIiwiYXBwbHlGaWx0ZXIiLCJsb2FkZWQiLCJnZXRRdWVyeVBhcmFtIiwicmVxdWVzdEluaXRpYWxTdGF0dXMiLCJwYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImdldCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwiY29weVRvQ2xpcGJvYXJkIiwic2VjcmV0IiwiZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0IiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5Iiwibm9SZXN1bHRzSHRtbCIsImV4X05vU2VhcmNoUmVzdWx0cyIsImV4X1RyeURpZmZlcmVudEtleXdvcmRzIiwicGFnaW5hdGlvbldyYXBwZXIiLCJwYWdpbmF0aW9uSW5mbyIsImNvbnRlbnQiLCJpc1NlY3VyZUNvbnRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQiLCJ0ZXh0QXJlYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwiY29uc29sZSIsInJlbW92ZUNoaWxkIiwiZ2V0U3RhdHVzZXMiLCJzaW1wbGlmaWVkIiwidXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsc0JBQXNCLEVBQUVILENBQUMsQ0FBQywwQkFBRCxDQXpC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ZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTaXBBUEksIFNlbWFudGljTG9jYWxpemF0aW9uLCBJbnB1dE1hc2tQYXR0ZXJucywgVXNlck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZSwgSW5wdXRtYXNrLCBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IsIEV4dGVuc2lvbnNBUEksIEVtcGxveWVlc0FQSSAqL1xuXG5cbi8qKlxuICogVGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUgaGFuZGxlcyB0aGUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGV4dGVuc2lvbnMgaW5kZXggcGFnZS5cbiAqXG4gKiBAbW9kdWxlIGV4dGVuc2lvbnNJbmRleFxuICovXG5jb25zdCBleHRlbnNpb25zSW5kZXggPSB7XG4gICAgbWFza0xpc3Q6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZXh0ZW5zaW9ucyB0YWJsZSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNMaXN0OiAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWwtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFnZUxlbmd0aFNlbGVjdG9yOiQoJyNwYWdlLWxlbmd0aC1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWFyY2hFeHRlbnNpb25zSW5wdXQ6ICQoJyNzZWFyY2gtZXh0ZW5zaW9ucy1pbnB1dCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgY291bnRlciBmb3IgRGF0YVRhYmxlcyBkcmF3IHBhcmFtZXRlclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZHJhd0NvdW50ZXI6IDEsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lb3V0IHJlZmVyZW5jZSBmb3IgcmV0cnkgYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJldHJ5VGltZW91dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJvZHk6ICQoJ2JvZHknKSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIG5lY2Vzc2FyeSBpbnRlcmFjdGl2aXR5IGFuZCBmZWF0dXJlcyBvbiB0aGUgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEhhbmRsZSBhdmF0YXJzIHdpdGggbWlzc2luZyBzcmNcbiAgICAgICAgJCgnLmF2YXRhcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cignc3JjJykgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBidWxrIGFjdGlvbnMgZHJvcGRvd25cbiAgICAgICAgJCgnI2J1bGstYWN0aW9ucy1kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRvdWJsZS1jbGljayBiZWhhdmlvciBvbiB0aGUgZXh0ZW5zaW9uIHJvd3MgdXNpbmcgZGVsZWdhdGlvbiBmb3IgZHluYW1pYyBjb250ZW50LlxuICAgICAgICAvLyBFeGNsdWRlIGJ1dHRvbnMgY29sdW1uIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBuYXZpZ2F0aW9uIHdoZW4gdHJ5aW5nIHRvIGRlbGV0ZVxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2RibGNsaWNrJywgJy5leHRlbnNpb24tcm93IHRkOm5vdCg6bGFzdC1jaGlsZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZXh0ZW5zaW9uSWR9YDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBmdW5jdGlvbmFsaXR5IG9uIGRlbGV0ZSBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGRhdGFiYXNlIGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWV4dGVuc2lvbi1pZCcpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIEVtcGxveWVlc0FQSSBtZXRob2QgdG8gZGVsZXRlIHRoZSBlbXBsb3llZSByZWNvcmQuXG4gICAgICAgICAgICBFbXBsb3llZXNBUEkuZGVsZXRlUmVjb3JkKGV4dGVuc2lvbklkLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckRlbGV0ZVJlY29yZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBjb3B5IHNlY3JldCBidXR0b24gY2xpY2suXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignY2xpY2snLCAnYS5jbGlwYm9hcmQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnZGl2LmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIG51bWJlciBmcm9tIHRoZSBjbG9zZXN0IHRhYmxlIHJvdy5cbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IHByZXZpb3VzIEFKQVggbWVzc2FnZXMuXG4gICAgICAgICAgICAkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIFBieEFwaSBtZXRob2QgdG8gZ2V0IHRoZSBleHRlbnNpb24gc2VjcmV0LlxuICAgICAgICAgICAgU2lwQVBJLmdldFNlY3JldChudW1iZXIsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyR2V0U2VjcmV0KTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXNldCBkYXRhdGFibGUgc29ydHMgYW5kIHBhZ2VcbiAgICAgICAgJChgYVtocmVmPScke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9pbmRleC8jcmVzZXQtY2FjaGUnXWApLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKS5zdGF0ZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyNyZXNldC1jYWNoZSc7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciB0byBzYXZlIHRoZSB1c2VyJ3MgcGFnZSBsZW5ndGggc2VsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIHRhYmxlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFnZUxlbmd0aD09PSdhdXRvJyl7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VMZW5ndGggPSBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJywgcGFnZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUucGFnZS5sZW4ocGFnZUxlbmd0aCkuZHJhdygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgU2VhcmNoIGNvbXBvbmVudFxuICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goe1xuICAgICAgICAgICAgbWluQ2hhcmFjdGVyczogMCxcbiAgICAgICAgICAgIHNlYXJjaE9uRm9jdXM6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoRmllbGRzOiBbJ3RpdGxlJ10sXG4gICAgICAgICAgICBzaG93Tm9SZXN1bHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUV4dGVuc2lvbiwgdmFsdWU6ICdudW1iZXI6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeU1vYmlsZSwgdmFsdWU6ICdtb2JpbGU6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUVtYWlsLCB2YWx1ZTogJ2VtYWlsOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlJRCwgdmFsdWU6ICdpZDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5Q3VzdG9tUGhyYXNlLCB2YWx1ZTogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvblNlbGVjdDogZnVuY3Rpb24ocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCgnaGlkZSByZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggd2hlbiB5b3UgY2xpY2sgb24gdGhlIGljb25cbiAgICAgICAgJCgnI3NlYXJjaC1pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5mb2N1cygpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKCdxdWVyeScpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gU2V0IHVwIHRoZSBEYXRhVGFibGUgb24gdGhlIGV4dGVuc2lvbnMgbGlzdC5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSBcIiNyZXNldC1jYWNoZVwiKSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnRGF0YVRhYmxlc19leHRlbnNpb25zLXRhYmxlXy9hZG1pbi1jYWJpbmV0L2V4dGVuc2lvbnMvaW5kZXgvJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHVzZXIncyBzYXZlZCB2YWx1ZSBvciB1c2UgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCB2YWx1ZSBpZiBub25lIGV4aXN0c1xuICAgICAgICBjb25zdCBzYXZlZFBhZ2VMZW5ndGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcpO1xuICAgICAgICBjb25zdCBwYWdlTGVuZ3RoID0gc2F2ZWRQYWdlTGVuZ3RoID8gc2F2ZWRQYWdlTGVuZ3RoIDogZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSh7XG4gICAgICAgICAgICAvLyBFbmFibGUgc3RhdGUgc2F2aW5nIHRvIGF1dG9tYXRpY2FsbHkgc2F2ZSBhbmQgcmVzdG9yZSB0aGUgdGFibGUncyBzdGF0ZVxuICAgICAgICAgICAgc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAgICAgIHsgZGVmYXVsdENvbnRlbnQ6IFwiLVwiLCAgdGFyZ2V0czogXCJfYWxsXCJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAxfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMywgIHRhcmdldHM6IDJ9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA0LCAgdGFyZ2V0czogM30sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDUsICB0YXJnZXRzOiA0fSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IC0xfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XG4gICAgICAgICAgICAgICAgZGV0YWlsczogZmFsc2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAndXNlcl91c2VybmFtZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdtb2JpbGUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAndXNlcl9lbWFpbCcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAvcGJ4Y29yZS9hcGkvdjMvZW1wbG95ZWVzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluY3JlbWVudCBkcmF3IGNvdW50ZXIgZm9yIHRoaXMgcmVxdWVzdFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZHJhd0NvdW50ZXIgPSBkLmRyYXcgfHwgKytleHRlbnNpb25zSW5kZXguZHJhd0NvdW50ZXI7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gRGF0YVRhYmxlcyByZXF1ZXN0IHRvIG91ciBSRVNUIEFQSSBmb3JtYXQgKHF1ZXJ5IHBhcmFtcyBmb3IgR0VUKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogZC5zZWFyY2gudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDogZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzb3J0aW5nIGluZm9ybWF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChkLm9yZGVyICYmIGQub3JkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJDb2x1bW4gPSBkLmNvbHVtbnNbZC5vcmRlclswXS5jb2x1bW5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9yZGVyQ29sdW1uICYmIG9yZGVyQ29sdW1uLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vcmRlcl9ieSA9IG9yZGVyQ29sdW1uLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdERhdGEub3JkZXJfZGlyZWN0aW9uID0gZC5vcmRlclswXS5kaXIudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3REYXRhO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcGFnaW5hdGlvbiBmb3JtYXQgZnJvbSBFbXBsb3llZXMgQVBJXG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zOiB7ZGF0YToge2RhdGE6IFsuLi5dLCByZWNvcmRzVG90YWw6IG4sIHJlY29yZHNGaWx0ZXJlZDogbn19XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGFuZCBwYWdpbmF0aW9uIGluZm8gZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGpzb24uZGF0YT8uZGF0YSB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3Jkc1RvdGFsID0ganNvbi5kYXRhPy5yZWNvcmRzVG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3Jkc0ZpbHRlcmVkID0ganNvbi5kYXRhPy5yZWNvcmRzRmlsdGVyZWQgfHwgcmVjb3Jkc1RvdGFsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gaW5mbyBvbiB0aGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIGpzb24uZHJhdyA9IGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSByZWNvcmRzVG90YWw7XG4gICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcmVjb3Jkc0ZpbHRlcmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybiBqdXN0IHRoZSBkYXRhIGFycmF5IGZvciBEYXRhVGFibGVzIHRvIHByb2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdXBwcmVzcyB0aGUgZGVmYXVsdCBlcnJvciBhbGVydFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyByZXRyeSB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB1cCByZXRyeSBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFByZXZlbnQgZGVmYXVsdCBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHNjcm9sbGVyOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogJyAnLCAgLy8gRW1wdHkgc3RyaW5nIHRvIGhpZGUgZGVmYXVsdCBtZXNzYWdlXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6ICcgJyAvLyBFbXB0eSBzdHJpbmcgdG8gaGlkZSBkZWZhdWx0IG1lc3NhZ2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcGxhdGVSb3cgID0gICQoJy5leHRlbnNpb24tcm93LXRwbCcpLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhdmF0YXIgPSAkdGVtcGxhdGVSb3cuZmluZCgnLmF2YXRhcicpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYXR0cignc3JjJywgZGF0YS5hdmF0YXIpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYWZ0ZXIoZGF0YS51c2VyX3VzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm51bWJlcicpLnRleHQoZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubW9iaWxlIGlucHV0JykuYXR0cigndmFsdWUnLCBkYXRhLm1vYmlsZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5lbWFpbCcpLnRleHQoZGF0YS51c2VyX2VtYWlsKTtcblxuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5yZW1vdmVDbGFzcygnc21hbGwnKS5hZGRDbGFzcygndGlueScpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgJGVkaXRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uZWRpdCcpO1xuICAgICAgICAgICAgICAgIGlmICgkZWRpdEJ1dHRvbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGVkaXRCdXR0b24uYXR0cignaHJlZicsYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGEuaWR9YClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgICAgIGlmICgkY2xpcGJvYXJkQnV0dG9uICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnLCBkYXRhLm51bWJlcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtdmFsdWUnLCBkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2lkJywgZGF0YS5udW1iZXIpOyAvLyBVc2UgZXh0ZW5zaW9uIG51bWJlciBhcyBJRCBmb3Igc3RhdHVzIG1vbml0b3JcbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1leHRlbnNpb24taWQnLCBkYXRhLmlkKTsgLy8gUHJlc2VydmUgZGF0YWJhc2UgSUQgYXMgZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAkKHJvdykuYWRkQ2xhc3MoJ2V4dGVuc2lvbi1yb3cnKTsgLy8gQWRkIGNsYXNzIGZvciBzdGF0dXMgbW9uaXRvclxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IGRpc2FibGVkIGNsYXNzIGlmIGV4dGVuc2lvbiBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICQocm93KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgY2FjaGVkIHN0YXR1cyBpbW1lZGlhdGVseSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnN0YXR1c0NhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlZFN0YXR1cyA9IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5zdGF0dXNDYWNoZVtkYXRhLm51bWJlcl07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYWNoZWRTdGF0dXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0YXR1cyBpcyBhdmFpbGFibGUgaW4gY2FjaGUsIGFwcGx5IGl0IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDb2xvciA9IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5nZXRDb2xvckZvclN0YXR1cyhjYWNoZWRTdGF0dXMuc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJChyb3cpLmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdHVzQ29sb3J9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJFeHRlbnNpb24gJHtkYXRhLm51bWJlcn06ICR7Y2FjaGVkU3RhdHVzLnN0YXR1c31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICQuZWFjaCgkKCd0ZCcsICR0ZW1wbGF0ZVJvdyksIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKGluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoJCh2YWx1ZSkuaHRtbCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCQodmFsdWUpLmF0dHIoJ2NsYXNzJykpXG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBmb3IgbW9iaWxlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemVJbnB1dG1hc2soJCgnaW5wdXQubW9iaWxlLW51bWJlci1pbnB1dCcpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWJsZSBpcyBlbXB0eSBhbmQgc2hvdyBhcHByb3ByaWF0ZSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3QgYXBpID0gbmV3ICQuZm4uZGF0YVRhYmxlLkFwaShzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZUluZm8gPSBhcGkucGFnZS5pbmZvKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUmVjb3JkcyA9IHBhZ2VJbmZvLnJlY29yZHNEaXNwbGF5ID4gMDtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IGFwaS5zZWFyY2goKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWhhc1JlY29yZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGR1ZSB0byBzZWFyY2ggZmlsdGVyIG9yIHRydWx5IGVtcHR5IGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZSAmJiBzZWFyY2hWYWx1ZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IFwiTm90aGluZyBmb3VuZFwiIG1lc3NhZ2UgZm9yIHNlYXJjaCByZXN1bHRzXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguc2hvd05vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgXCJBZGQgZmlyc3QgZW1wbG95ZWVcIiBwbGFjZWhvbGRlciBmb3IgZW1wdHkgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlLWNvbnRhaW5lcicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXBsYWNlaG9sZGVyJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBpbiB0aGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXBsYWNlaG9sZGVyIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1wbGFjZWhvbGRlcicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzZXMgdG8gbmV3bHkgcmVuZGVyZWQgcm93c1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggRE9NIGNhY2hlIGZvciBuZXcgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnJlZnJlc2hDYWNoZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHkgY2FjaGVkIHN0YXR1c2VzIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IuYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzZXMgZm9yIGFueSBuZXcgZXh0ZW5zaW9ucyBub3QgaW4gY2FjaGVcbiAgICAgICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5yZXF1ZXN0U3RhdHVzZXNGb3JOZXdFeHRlbnNpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBwYWdpbmF0aW9uIHdoZW4gdGhlcmUgYXJlIGZldyByZWNvcmRzIChsZXNzIHRoYW4gcGFnZSBsZW5ndGgpXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5KHBhZ2VJbmZvKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcG9wdXBzLlxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBEaXNhYmxlIERhdGFUYWJsZXMgZXJyb3IgYWxlcnRzIGNvbXBsZXRlbHlcbiAgICAgICAgICAgIGZuSW5pdENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBPdmVycmlkZSBEYXRhVGFibGVzIGVycm9yIGV2ZW50IGhhbmRsZXJcbiAgICAgICAgICAgICAgICAkLmZuLmRhdGFUYWJsZS5leHQuZXJyTW9kZSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBzZWxlY3QgaW5wdXQgdmFsdWUgdG8gdGhlIHNhdmVkIHZhbHVlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoc2F2ZWRQYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bignc2V0IHZhbHVlJyxzYXZlZFBhZ2VMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZSA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJvdW5jZSB0aW1lciB2YXJpYWJsZVxuICAgICAgICBsZXQgc2VhcmNoRGVib3VuY2VUaW1lciA9IG51bGw7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gub24oJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVyIGlmIHRoZSB1c2VyIGlzIHN0aWxsIHR5cGluZ1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHNlYXJjaERlYm91bmNlVGltZXIpO1xuXG4gICAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgZm9yIGRlbGF5ZWQgZXhlY3V0aW9uXG4gICAgICAgICAgICBzZWFyY2hEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHNlYXJjaCBpZiBpbnB1dCBpcyB2YWxpZCAoRW50ZXIsIEJhY2tzcGFjZSwgb3IgbW9yZSB0aGFuIDIgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMyB8fCBlLmtleUNvZGUgPT09IDggfHwgdGV4dC5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIodGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVsYXkgYmVmb3JlIGV4ZWN1dGluZyB0aGUgc2VhcmNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUub24oJ2RyYXcnLCAoKSA9PiB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHNhdmVkIHNlYXJjaCBwaHJhc2UgZnJvbSBEYXRhVGFibGVzIHN0YXRlXG4gICAgICAgIGNvbnN0IHN0YXRlID0gZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zdGF0ZS5sb2FkZWQoKTtcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNlYXJjaCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHN0YXRlLnNlYXJjaC5zZWFyY2gpOyAvLyBTZXQgdGhlIHNlYXJjaCBmaWVsZCB3aXRoIHRoZSBzYXZlZCB2YWx1ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiAnc2VhcmNoJyBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9IGV4dGVuc2lvbnNJbmRleC5nZXRRdWVyeVBhcmFtKCdzZWFyY2gnKTtcblxuICAgICAgICAvLyBTZXRzIHRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IHZhbHVlIGFuZCBhcHBsaWVzIHRoZSBmaWx0ZXIgaWYgYSBzZWFyY2ggdmFsdWUgaXMgcHJvdmlkZWQuXG4gICAgICAgIGlmIChzZWFyY2hWYWx1ZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcihzZWFyY2hWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIGluZGV4IHN0YXR1cyBtb25pdG9yIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICAvLyBSZXF1ZXN0IGluaXRpYWwgc3RhdHVzIGFmdGVyIHRhYmxlIGxvYWRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciB0byByZXRyaWV2ZS5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd8bnVsbH0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIsIG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICAgICAqL1xuICAgIGdldFF1ZXJ5UGFyYW0ocGFyYW0pIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHVybFBhcmFtcy5nZXQocGFyYW0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygcm93cyB0aGF0IGNhbiBmaXQgb24gYSBwYWdlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHdpbmRvdyBoZWlnaHQuXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKCd0cicpLmZpcnN0KCkub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDM5MDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBkZWxldGluZyBhIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRoZSBkYXRhdGFibGUgdG8gcmVmbGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBkYXRhIGNoYW5nZSBpZiBpdCBleGlzdHMuXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZGVsZXRpb24gd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBjZXQgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0U2VjcmV0KHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZChgYS5jbGlwYm9hcmRbZGF0YS12YWx1ZT0ke3Jlc3BvbnNlLmRhdGEubnVtYmVyfV1gKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5jb3B5VG9DbGlwYm9hcmQocmVzcG9uc2UuZGF0YS5zZWNyZXQpO1xuICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGFuIGVycm9yIG1lc3NhZ2UgaWYgZ2V0IHNlY3JldCB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9HZXRTZWNyZXQpO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuY2xpcGJvYXJkJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGlucHV0IG1hc2tzIGZvciB2aXN1YWxpemluZyBmb3JtYXR0ZWQgbnVtYmVycy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0gVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IHRvIGluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0bWFzaygkZWwpIHtcbiAgICAgICAgaWYgKGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gUHJlcGFyZXMgdGhlIHRhYmxlIGZvciBzb3J0XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcbiAgICAgICAgfVxuICAgICAgICAkZWwuaW5wdXRtYXNrcyh7XG4gICAgICAgICAgICBpbnB1dG1hc2s6IHtcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAnIyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcjogJ1swLTldJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmRpbmFsaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWF0Y2g6IC9bMC05XS8sXG4gICAgICAgICAgICByZXBsYWNlOiAnOScsXG4gICAgICAgICAgICBsaXN0OiBleHRlbnNpb25zSW5kZXgubWFza0xpc3QsXG4gICAgICAgICAgICBsaXN0S2V5OiAnbWFzaycsXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgZmlsdGVyIHRvIHRoZSBkYXRhIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIGZpbHRlciB0ZXh0LlxuICAgICAqL1xuICAgIGFwcGx5RmlsdGVyKHRleHQpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5zZWFyY2godGV4dCkuZHJhdygpO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5jbG9zZXN0KCdkaXYnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBcIk5vIHNlYXJjaCByZXN1bHRzIGZvdW5kXCIgbWVzc2FnZVxuICAgICAqL1xuICAgIHNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCkge1xuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIG5vLXJlc3VsdHMgbWVzc2FnZVxuICAgICAgICBleHRlbnNpb25zSW5kZXguaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgc2hvdyBubyByZXN1bHRzIG1lc3NhZ2VcbiAgICAgICAgY29uc3Qgbm9SZXN1bHRzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgaWQ9XCJuby1zZWFyY2gtcmVzdWx0c1wiIHN0eWxlPVwibWFyZ2luLXRvcDogMmVtO1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzZWFyY2ggaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob1NlYXJjaFJlc3VsdHN9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5leF9UcnlEaWZmZXJlbnRLZXl3b3Jkc308L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlLWNvbnRhaW5lcicpLmFmdGVyKG5vUmVzdWx0c0h0bWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlcyBcIk5vIHNlYXJjaCByZXN1bHRzIGZvdW5kXCIgbWVzc2FnZVxuICAgICAqL1xuICAgIGhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCkge1xuICAgICAgICAkKCcjbm8tc2VhcmNoLXJlc3VsdHMnKS5yZW1vdmUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyBwYWdpbmF0aW9uIHZpc2liaWxpdHkgYmFzZWQgb24gbnVtYmVyIG9mIHJlY29yZHNcbiAgICAgKiBIaWRlcyBwYWdpbmF0aW9uIHdoZW4gdGhlcmUgYXJlIGZld2VyIHJlY29yZHMgdGhhbiB0aGUgcGFnZSBsZW5ndGhcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFnZUluZm8gLSBEYXRhVGFibGVzIHBhZ2UgaW5mbyBvYmplY3RcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uVmlzaWJpbGl0eShwYWdlSW5mbykge1xuICAgICAgICBjb25zdCBwYWdpbmF0aW9uV3JhcHBlciA9ICQoJyNleHRlbnNpb25zLXRhYmxlX3BhZ2luYXRlJyk7XG4gICAgICAgIGNvbnN0IHBhZ2luYXRpb25JbmZvID0gJCgnI2V4dGVuc2lvbnMtdGFibGVfaW5mbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBwYWdpbmF0aW9uIGlmIHRvdGFsIHJlY29yZHMgZml0IG9uIG9uZSBwYWdlXG4gICAgICAgIGlmIChwYWdlSW5mby5yZWNvcmRzRGlzcGxheSA8PSBwYWdlSW5mby5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhZ2luYXRpb25XcmFwcGVyLmhpZGUoKTtcbiAgICAgICAgICAgIHBhZ2luYXRpb25JbmZvLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhZ2luYXRpb25XcmFwcGVyLnNob3coKTtcbiAgICAgICAgICAgIHBhZ2luYXRpb25JbmZvLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHRleHQgcGFzc2VkIGFzIHBhcmFtIHRvIHRoZSBzeXN0ZW0gY2xpcGJvYXJkXG4gICAgICogQ2hlY2sgaWYgdXNpbmcgSFRUUFMgYW5kIG5hdmlnYXRvci5jbGlwYm9hcmQgaXMgYXZhaWxhYmxlXG4gICAgICogVGhlbiB1c2VzIHN0YW5kYXJkIGNsaXBib2FyZCBBUEksIG90aGVyd2lzZSB1c2VzIGZhbGxiYWNrXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5pc1NlY3VyZUNvbnRleHQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBQdXQgdGV4dCB2YXJpYWJsZSBpbnRvIGNsaXBib2FyZCBmb3IgdW5zZWN1cmVkIGNvbm5lY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRlbnQgLSBUaGUgdGV4dCB2YWx1ZS5cbiAgICAgKi9cbiAgICB1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBjb25zdCB0ZXh0QXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICAgICAgdGV4dEFyZWEudmFsdWU9Y29udGVudDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgIHRleHRBcmVhLmZvY3VzKCk7dGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5JylcbiAgICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBjb3B5IHRvIGNsaXBib2FyZCcsIGVycilcbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbml0aWFsIGV4dGVuc2lvbiBzdGF0dXMgb24gcGFnZSBsb2FkXG4gICAgICovXG4gICAgcmVxdWVzdEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgU2lwQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNpbXBsaWZpZWQgbW9kZSBmb3IgaW5kZXggcGFnZSAtIHBhc3Mgb3B0aW9ucyBhcyBmaXJzdCBwYXJhbSwgY2FsbGJhY2sgYXMgc2Vjb25kXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U3RhdHVzZXMoeyBzaW1wbGlmaWVkOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IHRyaWdnZXIgc3RhdHVzIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWVzIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==