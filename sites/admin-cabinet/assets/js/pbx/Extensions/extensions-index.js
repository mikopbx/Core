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
    if (typeof ExtensionsAPI !== 'undefined') {
      // Use simplified mode for index page - pass options as first param, callback as second
      ExtensionsAPI.getStatuses({
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwiZHJhd0NvdW50ZXIiLCJyZXRyeVRpbWVvdXQiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZHJvcGRvd24iLCJvbiIsImUiLCJleHRlbnNpb25JZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJyZW1vdmUiLCJFbXBsb3llZXNBUEkiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInJlcXVlc3REYXRhIiwibGltaXQiLCJsZW5ndGgiLCJvZmZzZXQiLCJzdGFydCIsIm9yZGVyQ29sdW1uIiwiY29sdW1uIiwib3JkZXJfYnkiLCJvcmRlcl9kaXJlY3Rpb24iLCJkaXIiLCJ0b1VwcGVyQ2FzZSIsImRhdGFTcmMiLCJqc29uIiwicmVjb3Jkc1RvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY29uc29sZSIsImxvZyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJwYWdpbmciLCJzRG9tIiwiZGVmZXJSZW5kZXIiLCJzY3JvbGxDb2xsYXBzZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJlbXB0eVRhYmxlIiwiemVyb1JlY29yZHMiLCJjcmVhdGVkUm93Iiwicm93IiwiJHRlbXBsYXRlUm93IiwiY2xvbmUiLCIkYXZhdGFyIiwiZmluZCIsImF2YXRhciIsImFmdGVyIiwidXNlcl91c2VybmFtZSIsInRleHQiLCJtb2JpbGUiLCJ1c2VyX2VtYWlsIiwicmVtb3ZlQ2xhc3MiLCIkZWRpdEJ1dHRvbiIsInVuZGVmaW5lZCIsImlkIiwiJGNsaXBib2FyZEJ1dHRvbiIsImRpc2FibGVkIiwiRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yIiwic3RhdHVzQ2FjaGUiLCJjYWNoZWRTdGF0dXMiLCJzdGF0dXNDb2xvciIsImdldENvbG9yRm9yU3RhdHVzIiwic3RhdHVzIiwiJHN0YXR1c0NlbGwiLCJzdGF0dXNIdG1sIiwiaHRtbCIsImluZGV4IiwiZXEiLCJkcmF3Q2FsbGJhY2siLCJzZXR0aW5ncyIsImluaXRpYWxpemVJbnB1dG1hc2siLCJhcGkiLCJmbiIsIkFwaSIsInBhZ2VJbmZvIiwiaW5mbyIsImhhc1JlY29yZHMiLCJyZWNvcmRzRGlzcGxheSIsInNlYXJjaFZhbHVlIiwiaGlkZSIsInRyaW0iLCJzaG93Tm9TZWFyY2hSZXN1bHRzTWVzc2FnZSIsInNob3ciLCJoaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSIsInJlZnJlc2hDYWNoZSIsImFwcGx5U3RhdHVzZXNUb1Zpc2libGVSb3dzIiwicmVxdWVzdFN0YXR1c2VzRm9yTmV3RXh0ZW5zaW9ucyIsInRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5IiwicG9wdXAiLCJmbkluaXRDb21wbGV0ZSIsImV4dCIsImVyck1vZGUiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwia2V5Q29kZSIsImFwcGx5RmlsdGVyIiwibG9hZGVkIiwiZ2V0UXVlcnlQYXJhbSIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbiIsImNvcHlUb0NsaXBib2FyZCIsInNlY3JldCIsImV4X0ltcG9zc2libGVUb0dldFNlY3JldCIsIiRlbCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm5vUmVzdWx0c0h0bWwiLCJleF9Ob1NlYXJjaFJlc3VsdHMiLCJleF9UcnlEaWZmZXJlbnRLZXl3b3JkcyIsInBhZ2luYXRpb25XcmFwcGVyIiwicGFnaW5hdGlvbkluZm8iLCJjb250ZW50IiwiaXNTZWN1cmVDb250ZXh0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkIiwidGV4dEFyZWEiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJzZWxlY3QiLCJleGVjQ29tbWFuZCIsImVyciIsInJlbW92ZUNoaWxkIiwiRXh0ZW5zaW9uc0FQSSIsImdldFN0YXR1c2VzIiwic2ltcGxpZmllZCIsInVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUUsSUFEVTs7QUFHcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFQyxDQUFDLENBQUMsbUJBQUQsQ0FQRTs7QUFTcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FiSTs7QUFlcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsbUJBQW1CLEVBQUNGLENBQUMsQ0FBQyxxQkFBRCxDQW5CRDs7QUFxQnBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLHNCQUFzQixFQUFF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LGVBQWUsQ0FBQ1csVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2ssIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciwgRXh0ZW5zaW9uc0FQSSwgRW1wbG95ZWVzQVBJICovXG5cblxuLyoqXG4gKiBUaGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZSBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9ucyBpbmRleCBwYWdlLlxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0luZGV4XG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNJbmRleCA9IHtcbiAgICBtYXNrTGlzdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6ICQoJyNleHRlbnNpb25zLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBjb3VudGVyIGZvciBEYXRhVGFibGVzIGRyYXcgcGFyYW1ldGVyXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBkcmF3Q291bnRlcjogMSxcblxuICAgIC8qKlxuICAgICAqIFRpbWVvdXQgcmVmZXJlbmNlIGZvciByZXRyeSBhdHRlbXB0c1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgcmV0cnlUaW1lb3V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYm9keTogJCgnYm9keScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlLlxuICAgICAqIFNldHMgdXAgbmVjZXNzYXJ5IGludGVyYWN0aXZpdHkgYW5kIGZlYXR1cmVzIG9uIHRoZSBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGF2YXRhcnMgd2l0aCBtaXNzaW5nIHNyY1xuICAgICAgICAkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGJ1bGsgYWN0aW9ucyBkcm9wZG93blxuICAgICAgICAkKCcjYnVsay1hY3Rpb25zLWRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBTZXQgdXAgZG91YmxlLWNsaWNrIGJlaGF2aW9yIG9uIHRoZSBleHRlbnNpb24gcm93cyB1c2luZyBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGNvbnRlbnQuXG4gICAgICAgIC8vIEV4Y2x1ZGUgYnV0dG9ucyBjb2x1bW4gdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gd2hlbiB0cnlpbmcgdG8gZGVsZXRlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignZGJsY2xpY2snLCAnLmV4dGVuc2lvbi1yb3cgdGQ6bm90KDpsYXN0LWNoaWxkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtleHRlbnNpb25JZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZGF0YWJhc2UgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgRW1wbG95ZWVzQVBJIG1ldGhvZCB0byBkZWxldGUgdGhlIGVtcGxveWVlIHJlY29yZC5cbiAgICAgICAgICAgIEVtcGxveWVlc0FQSS5kZWxldGVSZWNvcmQoZXh0ZW5zaW9uSWQsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGNvcHkgc2VjcmV0IGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmNsaXBib2FyZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBnZXQgdGhlIGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U2VjcmV0KG51bWJlciwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJHZXRTZWNyZXQpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc2V0IGRhdGF0YWJsZSBzb3J0cyBhbmQgcGFnZVxuICAgICAgICAkKGBhW2hyZWY9JyR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4LyNyZXNldC1jYWNoZSddYCkub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpLnN0YXRlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnI3Jlc2V0LWNhY2hlJztcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RXh0ZW5zaW9uLCB2YWx1ZTogJ251bWJlcjonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5TW9iaWxlLCB2YWx1ZTogJ21vYmlsZTonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RW1haWwsIHZhbHVlOiAnZW1haWw6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUlELCB2YWx1ZTogJ2lkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcblxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI3Jlc2V0LWNhY2hlXCIpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdEYXRhVGFibGVzX2V4dGVuc2lvbnMtdGFibGVfL2FkbWluLWNhYmluZXQvZXh0ZW5zaW9ucy9pbmRleC8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBzdGF0ZSBzYXZpbmcgdG8gYXV0b21hdGljYWxseSBzYXZlIGFuZCByZXN0b3JlIHRoZSB0YWJsZSdzIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAwfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDF9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAzLCAgdGFyZ2V0czogMn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDQsICB0YXJnZXRzOiAzfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNSwgIHRhcmdldHM6IDR9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogLTF9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc3BvbnNpdmU6IHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2J1dHRvbnMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1sxLCAnYXNjJ11dLFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYC9wYnhjb3JlL2FwaS92My9lbXBsb3llZXNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGRyYXcgY291bnRlciBmb3IgdGhpcyByZXF1ZXN0XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlciA9IGQuZHJhdyB8fCArK2V4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBEYXRhVGFibGVzIHJlcXVlc3QgdG8gb3VyIFJFU1QgQVBJIGZvcm1hdCAocXVlcnkgcGFyYW1zIGZvciBHRVQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBkLnNlYXJjaC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiBkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogZC5zdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNvcnRpbmcgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGQub3JkZXIgJiYgZC5vcmRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckNvbHVtbiA9IGQuY29sdW1uc1tkLm9yZGVyWzBdLmNvbHVtbl07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JkZXJDb2x1bW4gJiYgb3JkZXJDb2x1bW4ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3REYXRhLm9yZGVyX2J5ID0gb3JkZXJDb2x1bW4ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vcmRlcl9kaXJlY3Rpb24gPSBkLm9yZGVyWzBdLmRpci50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdERhdGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBwYWdpbmF0aW9uIGZvcm1hdCBmcm9tIEVtcGxveWVlcyBBUElcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnM6IHtkYXRhOiB7ZGF0YTogWy4uLl0sIHJlY29yZHNUb3RhbDogbiwgcmVjb3Jkc0ZpbHRlcmVkOiBufX1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGRhdGEgYW5kIHBhZ2luYXRpb24gaW5mbyBmcm9tIHRoZSByZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ganNvbi5kYXRhPy5kYXRhIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRzVG90YWwgPSBqc29uLmRhdGE/LnJlY29yZHNUb3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRzRmlsdGVyZWQgPSBqc29uLmRhdGE/LnJlY29yZHNGaWx0ZXJlZCB8fCByZWNvcmRzVG90YWw7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBpbmZvIG9uIHRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAganNvbi5kcmF3ID0gZXh0ZW5zaW9uc0luZGV4LmRyYXdDb3VudGVyO1xuICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHJlY29yZHNUb3RhbDtcbiAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSByZWNvcmRzRmlsdGVyZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGp1c3QgdGhlIGRhdGEgYXJyYXkgZm9yIERhdGFUYWJsZXMgdG8gcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1cHByZXNzIHRoZSBkZWZhdWx0IGVycm9yIGFsZXJ0XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEYXRhVGFibGUgcmVxdWVzdCBmYWlsZWQsIHdpbGwgcmV0cnkgaW4gMyBzZWNvbmRzJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgcmV0cnkgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcmV0cnkgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBQcmV2ZW50IGRlZmF1bHQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy8gc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6ICcgJywgIC8vIEVtcHR5IHN0cmluZyB0byBoaWRlIGRlZmF1bHQgbWVzc2FnZVxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiAnICcgLy8gRW1wdHkgc3RyaW5nIHRvIGhpZGUgZGVmYXVsdCBtZXNzYWdlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBFeHRlbnNpb25zIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXBsYXRlUm93ICA9ICAkKCcuZXh0ZW5zaW9uLXJvdy10cGwnKS5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYXZhdGFyID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hdmF0YXInKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmF0dHIoJ3NyYycsIGRhdGEuYXZhdGFyKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmFmdGVyKGRhdGEudXNlcl91c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5udW1iZXInKS50ZXh0KGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm1vYmlsZSBpbnB1dCcpLmF0dHIoJ3ZhbHVlJywgZGF0YS5tb2JpbGUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuZW1haWwnKS50ZXh0KGRhdGEudXNlcl9lbWFpbCk7XG5cbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucmVtb3ZlQ2xhc3MoJ3NtYWxsJykuYWRkQ2xhc3MoJ3RpbnknKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0ICRlZGl0QnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmVkaXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVkaXRCdXR0b24gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRlZGl0QnV0dG9uLmF0dHIoJ2hyZWYnLGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtkYXRhLmlkfWApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGNsaXBib2FyZEJ1dHRvbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJywgZGF0YS5udW1iZXIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXZhbHVlJywgZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdpZCcsIGRhdGEubnVtYmVyKTsgLy8gVXNlIGV4dGVuc2lvbiBudW1iZXIgYXMgSUQgZm9yIHN0YXR1cyBtb25pdG9yXG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJywgZGF0YS5pZCk7IC8vIFByZXNlcnZlIGRhdGFiYXNlIElEIGFzIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgJChyb3cpLmFkZENsYXNzKCdleHRlbnNpb24tcm93Jyk7IC8vIEFkZCBjbGFzcyBmb3Igc3RhdHVzIG1vbml0b3JcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBkaXNhYmxlZCBjbGFzcyBpZiBleHRlbnNpb24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAkKHJvdykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXMgaW1tZWRpYXRlbHkgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5zdGF0dXNDYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZWRTdGF0dXMgPSBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3Iuc3RhdHVzQ2FjaGVbZGF0YS5udW1iZXJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2FjaGVkU3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGF0dXMgaXMgYXZhaWxhYmxlIGluIGNhY2hlLCBhcHBseSBpdCBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ29sb3IgPSBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IuZ2V0Q29sb3JGb3JTdGF0dXMoY2FjaGVkU3RhdHVzLnN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICQocm93KS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRXh0ZW5zaW9uICR7ZGF0YS5udW1iZXJ9OiAke2NhY2hlZFN0YXR1cy5zdGF0dXN9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkLmVhY2goJCgndGQnLCAkdGVtcGxhdGVSb3cpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcShpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKCQodmFsdWUpLmh0bWwoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygkKHZhbHVlKS5hdHRyKCdjbGFzcycpKVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjayhzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgZm9yIG1vYmlsZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplSW5wdXRtYXNrKCQoJ2lucHV0Lm1vYmlsZS1udW1iZXItaW5wdXQnKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFibGUgaXMgZW1wdHkgYW5kIHNob3cgYXBwcm9wcmlhdGUgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFwaSA9IG5ldyAkLmZuLmRhdGFUYWJsZS5BcGkoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmZvID0gYXBpLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZHMgPSBwYWdlSW5mby5yZWNvcmRzRGlzcGxheSA+IDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSBhcGkuc2VhcmNoKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBkdWUgdG8gc2VhcmNoIGZpbHRlciBvciB0cnVseSBlbXB0eSBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VhcmNoVmFsdWUgJiYgc2VhcmNoVmFsdWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBcIk5vdGhpbmcgZm91bmRcIiBtZXNzYWdlIGZvciBzZWFyY2ggcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IFwiQWRkIGZpcnN0IGVtcGxveWVlXCIgcGxhY2Vob2xkZXIgZm9yIGVtcHR5IGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1wbGFjZWhvbGRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gaW4gdGhlIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1wbGFjZWhvbGRlciAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5oaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHkgY2FjaGVkIHN0YXR1c2VzIHRvIG5ld2x5IHJlbmRlcmVkIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIERPTSBjYWNoZSBmb3IgbmV3IHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXNlcyBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmFwcGx5U3RhdHVzZXNUb1Zpc2libGVSb3dzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1c2VzIGZvciBhbnkgbmV3IGV4dGVuc2lvbnMgbm90IGluIGNhY2hlXG4gICAgICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IucmVxdWVzdFN0YXR1c2VzRm9yTmV3RXh0ZW5zaW9ucygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgcGFnaW5hdGlvbiB3aGVuIHRoZXJlIGFyZSBmZXcgcmVjb3JkcyAobGVzcyB0aGFuIHBhZ2UgbGVuZ3RoKVxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC50b2dnbGVQYWdpbmF0aW9uVmlzaWJpbGl0eShwYWdlSW5mbyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHVwIHBvcHVwcy5cbiAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gRGlzYWJsZSBEYXRhVGFibGVzIGVycm9yIGFsZXJ0cyBjb21wbGV0ZWx5XG4gICAgICAgICAgICBmbkluaXRDb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRGF0YVRhYmxlcyBlcnJvciBldmVudCBoYW5kbGVyXG4gICAgICAgICAgICAgICAgJC5mbi5kYXRhVGFibGUuZXh0LmVyck1vZGUgPSAnbm9uZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgc2VsZWN0IGlucHV0IHZhbHVlIHRvIHRoZSBzYXZlZCB2YWx1ZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKHNhdmVkUGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oJ3NldCB2YWx1ZScsc2F2ZWRQYWdlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVib3VuY2UgdGltZXIgdmFyaWFibGVcbiAgICAgICAgbGV0IHNlYXJjaERlYm91bmNlVGltZXIgPSBudWxsO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLm9uKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lciBpZiB0aGUgdXNlciBpcyBzdGlsbCB0eXBpbmdcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWFyY2hEZWJvdW5jZVRpbWVyKTtcblxuICAgICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIGZvciBkZWxheWVkIGV4ZWN1dGlvblxuICAgICAgICAgICAgc2VhcmNoRGVib3VuY2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSBzZWFyY2ggaWYgaW5wdXQgaXMgdmFsaWQgKEVudGVyLCBCYWNrc3BhY2UsIG9yIG1vcmUgdGhhbiAyIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMgfHwgZS5rZXlDb2RlID09PSA4IHx8IHRleHQubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlbGF5IGJlZm9yZSBleGVjdXRpbmcgdGhlIHNlYXJjaFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLm9uKCdkcmF3JywgKCkgPT4ge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBzYXZlZCBzZWFyY2ggcGhyYXNlIGZyb20gRGF0YVRhYmxlcyBzdGF0ZVxuICAgICAgICBjb25zdCBzdGF0ZSA9IGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc3RhdGUubG9hZGVkKCk7XG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zZWFyY2gpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzdGF0ZS5zZWFyY2guc2VhcmNoKTsgLy8gU2V0IHRoZSBzZWFyY2ggZmllbGQgd2l0aCB0aGUgc2F2ZWQgdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgJ3NlYXJjaCcgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSBleHRlbnNpb25zSW5kZXguZ2V0UXVlcnlQYXJhbSgnc2VhcmNoJyk7XG5cbiAgICAgICAgLy8gU2V0cyB0aGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCB2YWx1ZSBhbmQgYXBwbGllcyB0aGUgZmlsdGVyIGlmIGEgc2VhcmNoIHZhbHVlIGlzIHByb3ZpZGVkLlxuICAgICAgICBpZiAoc2VhcmNoVmFsdWUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLnZhbChzZWFyY2hWYWx1ZSk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguYXBwbHlGaWx0ZXIoc2VhcmNoVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBpbmRleCBzdGF0dXMgbW9uaXRvciBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1cyBhZnRlciB0YWJsZSBsb2Fkc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXIgdG8gcmV0cmlldmUuXG4gICAgICogQHJldHVybiB7c3RyaW5nfG51bGx9IFRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyLCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICAgKi9cbiAgICBnZXRRdWVyeVBhcmFtKHBhcmFtKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHJldHVybiB1cmxQYXJhbXMuZ2V0KHBhcmFtKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHJvd3MgdGhhdCBjYW4gZml0IG9uIGEgcGFnZSBiYXNlZCBvbiB0aGUgY3VycmVudCB3aW5kb3cgaGVpZ2h0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuZmluZCgndHInKS5maXJzdCgpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSAzOTA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCA1KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZGVsZXRpbmcgYSByZWNvcmQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0aGUgZGF0YXRhYmxlIHRvIHJlZmxlY3QgY2hhbmdlc1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UgaWYgaXQgZXhpc3RzLlxuICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGRlbGV0aW9uIHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgY2V0IGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkuXG4gICAgICovXG4gICAgY2JBZnRlckdldFNlY3JldChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoYGEuY2xpcGJvYXJkW2RhdGEtdmFsdWU9JHtyZXNwb25zZS5kYXRhLm51bWJlcn1dYCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguY29weVRvQ2xpcGJvYXJkKHJlc3BvbnNlLmRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBhbiBlcnJvciBtZXNzYWdlIGlmIGdldCBzZWNyZXQgd2FzIG5vdCBzdWNjZXNzZnVsLlxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLCBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0KTtcbiAgICAgICAgfVxuICAgICAgICAkKCdhLmNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBpbnB1dCBtYXNrcyBmb3IgdmlzdWFsaXppbmcgZm9ybWF0dGVkIG51bWJlcnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIG9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG4gICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgubWFza0xpc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFByZXBhcmVzIHRoZSB0YWJsZSBmb3Igc29ydFxuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgJGVsLmlucHV0bWFza3Moe1xuICAgICAgICAgICAgaW5wdXRtYXNrOiB7XG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJyMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3I6ICdbMC05XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hdGNoOiAvWzAtOV0vLFxuICAgICAgICAgICAgcmVwbGFjZTogJzknLFxuICAgICAgICAgICAgbGlzdDogZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0LFxuICAgICAgICAgICAgbGlzdEtleTogJ21hc2snLFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGZpbHRlciB0byB0aGUgZGF0YSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBmaWx0ZXIgdGV4dC5cbiAgICAgKi9cbiAgICBhcHBseUZpbHRlcih0ZXh0KSB7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuc2VhcmNoKHRleHQpLmRyYXcoKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guY2xvc2VzdCgnZGl2JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgXCJObyBzZWFyY2ggcmVzdWx0cyBmb3VuZFwiIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93Tm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBuby1yZXN1bHRzIG1lc3NhZ2VcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYW5kIHNob3cgbm8gcmVzdWx0cyBtZXNzYWdlXG4gICAgICAgIGNvbnN0IG5vUmVzdWx0c0h0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGlkPVwibm8tc2VhcmNoLXJlc3VsdHNcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDJlbTtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2VhcmNoIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9TZWFyY2hSZXN1bHRzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZXhfVHJ5RGlmZmVyZW50S2V5d29yZHN9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5hZnRlcihub1Jlc3VsdHNIdG1sKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZXMgXCJObyBzZWFyY2ggcmVzdWx0cyBmb3VuZFwiIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpIHtcbiAgICAgICAgJCgnI25vLXNlYXJjaC1yZXN1bHRzJykucmVtb3ZlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgcGFnaW5hdGlvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIG51bWJlciBvZiByZWNvcmRzXG4gICAgICogSGlkZXMgcGFnaW5hdGlvbiB3aGVuIHRoZXJlIGFyZSBmZXdlciByZWNvcmRzIHRoYW4gdGhlIHBhZ2UgbGVuZ3RoXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhZ2VJbmZvIC0gRGF0YVRhYmxlcyBwYWdlIGluZm8gb2JqZWN0XG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkocGFnZUluZm8pIHtcbiAgICAgICAgY29uc3QgcGFnaW5hdGlvbldyYXBwZXIgPSAkKCcjZXh0ZW5zaW9ucy10YWJsZV9wYWdpbmF0ZScpO1xuICAgICAgICBjb25zdCBwYWdpbmF0aW9uSW5mbyA9ICQoJyNleHRlbnNpb25zLXRhYmxlX2luZm8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgcGFnaW5hdGlvbiBpZiB0b3RhbCByZWNvcmRzIGZpdCBvbiBvbmUgcGFnZVxuICAgICAgICBpZiAocGFnZUluZm8ucmVjb3Jkc0Rpc3BsYXkgPD0gcGFnZUluZm8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYWdpbmF0aW9uV3JhcHBlci5oaWRlKCk7XG4gICAgICAgICAgICBwYWdpbmF0aW9uSW5mby5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWdpbmF0aW9uV3JhcHBlci5zaG93KCk7XG4gICAgICAgICAgICBwYWdpbmF0aW9uSW5mby5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSB0ZXh0IHBhc3NlZCBhcyBwYXJhbSB0byB0aGUgc3lzdGVtIGNsaXBib2FyZFxuICAgICAqIENoZWNrIGlmIHVzaW5nIEhUVFBTIGFuZCBuYXZpZ2F0b3IuY2xpcGJvYXJkIGlzIGF2YWlsYWJsZVxuICAgICAqIFRoZW4gdXNlcyBzdGFuZGFyZCBjbGlwYm9hcmQgQVBJLCBvdGhlcndpc2UgdXNlcyBmYWxsYmFja1xuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGlmICh3aW5kb3cuaXNTZWN1cmVDb250ZXh0ICYmIG5hdmlnYXRvci5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogUHV0IHRleHQgdmFyaWFibGUgaW50byBjbGlwYm9hcmQgZm9yIHVuc2VjdXJlZCBjb25uZWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IC0gVGhlIHRleHQgdmFsdWUuXG4gICAgICovXG4gICAgdW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkKGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XG4gICAgICAgIHRleHRBcmVhLnZhbHVlPWNvbnRlbnQ7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB0ZXh0QXJlYS5mb2N1cygpO3RleHRBcmVhLnNlbGVjdCgpO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29weSB0byBjbGlwYm9hcmQnLCBlcnIpXG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0QXJlYSlcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBleHRlbnNpb24gc3RhdHVzIG9uIHBhZ2UgbG9hZFxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnNBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2ltcGxpZmllZCBtb2RlIGZvciBpbmRleCBwYWdlIC0gcGFzcyBvcHRpb25zIGFzIGZpcnN0IHBhcmFtLCBjYWxsYmFjayBhcyBzZWNvbmRcbiAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0U3RhdHVzZXMoeyBzaW1wbGlmaWVkOiB0cnVlIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IHRyaWdnZXIgc3RhdHVzIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhICYmIHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRW1wbG95ZWVzIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==