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

      if (typeof ExtensionsAPI !== 'undefined' && typeof ExtensionsAPI.cbOnDataChanged === 'function') {
        ExtensionsAPI.cbOnDataChanged();
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
          ExtensionIndexStatusMonitor.updateAllExtensionStatuses(response.data); // Mark initial load as complete to allow subsequent pagination requests

          ExtensionIndexStatusMonitor.isInitialLoadComplete = true;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwiZHJhd0NvdW50ZXIiLCJyZXRyeVRpbWVvdXQiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZHJvcGRvd24iLCJvbiIsImUiLCJleHRlbnNpb25JZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJyZW1vdmUiLCJFbXBsb3llZXNBUEkiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInJlcXVlc3REYXRhIiwibGltaXQiLCJsZW5ndGgiLCJvZmZzZXQiLCJzdGFydCIsIm9yZGVyQ29sdW1uIiwiY29sdW1uIiwib3JkZXJfYnkiLCJvcmRlcl9kaXJlY3Rpb24iLCJkaXIiLCJ0b1VwcGVyQ2FzZSIsImRhdGFTcmMiLCJqc29uIiwicmVjb3Jkc1RvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInNjcm9sbENvbGxhcHNlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCIkdGVtcGxhdGVSb3ciLCJjbG9uZSIsIiRhdmF0YXIiLCJmaW5kIiwiYXZhdGFyIiwiYWZ0ZXIiLCJ1c2VyX3VzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsInVzZXJfZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiaWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiZGlzYWJsZWQiLCJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJzdGF0dXNDYWNoZSIsImNhY2hlZFN0YXR1cyIsInN0YXR1c0NvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzQ2VsbCIsInN0YXR1c0h0bWwiLCJodG1sIiwiaW5kZXgiLCJlcSIsImRyYXdDYWxsYmFjayIsInNldHRpbmdzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsImFwaSIsImZuIiwiQXBpIiwicGFnZUluZm8iLCJpbmZvIiwiaGFzUmVjb3JkcyIsInJlY29yZHNEaXNwbGF5Iiwic2VhcmNoVmFsdWUiLCJoaWRlIiwidHJpbSIsInNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwic2hvdyIsImhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwicmVmcmVzaENhY2hlIiwiYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MiLCJyZXF1ZXN0U3RhdHVzZXNGb3JOZXdFeHRlbnNpb25zIiwidG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkiLCJwb3B1cCIsImZuSW5pdENvbXBsZXRlIiwiZXh0IiwiZXJyTW9kZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJrZXlDb2RlIiwiYXBwbHlGaWx0ZXIiLCJsb2FkZWQiLCJnZXRRdWVyeVBhcmFtIiwicmVxdWVzdEluaXRpYWxTdGF0dXMiLCJwYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImdldCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIkV4dGVuc2lvbnNBUEkiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwiY29weVRvQ2xpcGJvYXJkIiwic2VjcmV0IiwiZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0IiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5Iiwibm9SZXN1bHRzSHRtbCIsImV4X05vU2VhcmNoUmVzdWx0cyIsImV4X1RyeURpZmZlcmVudEtleXdvcmRzIiwicGFnaW5hdGlvbldyYXBwZXIiLCJwYWdpbmF0aW9uSW5mbyIsImNvbnRlbnQiLCJpc1NlY3VyZUNvbnRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQiLCJ0ZXh0QXJlYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwiY29uc29sZSIsInJlbW92ZUNoaWxkIiwiZ2V0U3RhdHVzZXMiLCJzaW1wbGlmaWVkIiwidXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMiLCJpc0luaXRpYWxMb2FkQ29tcGxldGUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsc0JBQXNC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WUFBTTtBQUNwQjdPLEVBQUFBLGVBQWUsQ0FBQ1csVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2ssIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciwgRXh0ZW5zaW9uc0FQSSwgRW1wbG95ZWVzQVBJICovXG5cblxuLyoqXG4gKiBUaGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZSBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9ucyBpbmRleCBwYWdlLlxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0luZGV4XG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNJbmRleCA9IHtcbiAgICBtYXNrTGlzdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6ICQoJyNleHRlbnNpb25zLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBjb3VudGVyIGZvciBEYXRhVGFibGVzIGRyYXcgcGFyYW1ldGVyXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBkcmF3Q291bnRlcjogMSxcblxuICAgIC8qKlxuICAgICAqIFRpbWVvdXQgcmVmZXJlbmNlIGZvciByZXRyeSBhdHRlbXB0c1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgcmV0cnlUaW1lb3V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYm9keTogJCgnYm9keScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlLlxuICAgICAqIFNldHMgdXAgbmVjZXNzYXJ5IGludGVyYWN0aXZpdHkgYW5kIGZlYXR1cmVzIG9uIHRoZSBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGF2YXRhcnMgd2l0aCBtaXNzaW5nIHNyY1xuICAgICAgICAkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGJ1bGsgYWN0aW9ucyBkcm9wZG93blxuICAgICAgICAkKCcjYnVsay1hY3Rpb25zLWRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBTZXQgdXAgZG91YmxlLWNsaWNrIGJlaGF2aW9yIG9uIHRoZSBleHRlbnNpb24gcm93cyB1c2luZyBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGNvbnRlbnQuXG4gICAgICAgIC8vIEV4Y2x1ZGUgYnV0dG9ucyBjb2x1bW4gdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gd2hlbiB0cnlpbmcgdG8gZGVsZXRlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignZGJsY2xpY2snLCAnLmV4dGVuc2lvbi1yb3cgdGQ6bm90KDpsYXN0LWNoaWxkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtleHRlbnNpb25JZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZGF0YWJhc2UgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgRW1wbG95ZWVzQVBJIG1ldGhvZCB0byBkZWxldGUgdGhlIGVtcGxveWVlIHJlY29yZC5cbiAgICAgICAgICAgIEVtcGxveWVlc0FQSS5kZWxldGVSZWNvcmQoZXh0ZW5zaW9uSWQsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGNvcHkgc2VjcmV0IGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmNsaXBib2FyZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBnZXQgdGhlIGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U2VjcmV0KG51bWJlciwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJHZXRTZWNyZXQpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc2V0IGRhdGF0YWJsZSBzb3J0cyBhbmQgcGFnZVxuICAgICAgICAkKGBhW2hyZWY9JyR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4LyNyZXNldC1jYWNoZSddYCkub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpLnN0YXRlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnI3Jlc2V0LWNhY2hlJztcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RXh0ZW5zaW9uLCB2YWx1ZTogJ251bWJlcjonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5TW9iaWxlLCB2YWx1ZTogJ21vYmlsZTonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RW1haWwsIHZhbHVlOiAnZW1haWw6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUlELCB2YWx1ZTogJ2lkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcblxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI3Jlc2V0LWNhY2hlXCIpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdEYXRhVGFibGVzX2V4dGVuc2lvbnMtdGFibGVfL2FkbWluLWNhYmluZXQvZXh0ZW5zaW9ucy9pbmRleC8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBzdGF0ZSBzYXZpbmcgdG8gYXV0b21hdGljYWxseSBzYXZlIGFuZCByZXN0b3JlIHRoZSB0YWJsZSdzIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAwfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDF9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAzLCAgdGFyZ2V0czogMn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDQsICB0YXJnZXRzOiAzfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNSwgIHRhcmdldHM6IDR9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogLTF9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc3BvbnNpdmU6IHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2J1dHRvbnMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1sxLCAnYXNjJ11dLFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYC9wYnhjb3JlL2FwaS92My9lbXBsb3llZXNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGRyYXcgY291bnRlciBmb3IgdGhpcyByZXF1ZXN0XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlciA9IGQuZHJhdyB8fCArK2V4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBEYXRhVGFibGVzIHJlcXVlc3QgdG8gb3VyIFJFU1QgQVBJIGZvcm1hdCAocXVlcnkgcGFyYW1zIGZvciBHRVQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBkLnNlYXJjaC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiBkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogZC5zdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNvcnRpbmcgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGQub3JkZXIgJiYgZC5vcmRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckNvbHVtbiA9IGQuY29sdW1uc1tkLm9yZGVyWzBdLmNvbHVtbl07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JkZXJDb2x1bW4gJiYgb3JkZXJDb2x1bW4ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3REYXRhLm9yZGVyX2J5ID0gb3JkZXJDb2x1bW4ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vcmRlcl9kaXJlY3Rpb24gPSBkLm9yZGVyWzBdLmRpci50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdERhdGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBwYWdpbmF0aW9uIGZvcm1hdCBmcm9tIEVtcGxveWVlcyBBUElcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIHJldHVybnM6IHtkYXRhOiB7ZGF0YTogWy4uLl0sIHJlY29yZHNUb3RhbDogbiwgcmVjb3Jkc0ZpbHRlcmVkOiBufX1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGRhdGEgYW5kIHBhZ2luYXRpb24gaW5mbyBmcm9tIHRoZSByZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ganNvbi5kYXRhPy5kYXRhIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRzVG90YWwgPSBqc29uLmRhdGE/LnJlY29yZHNUb3RhbCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRzRmlsdGVyZWQgPSBqc29uLmRhdGE/LnJlY29yZHNGaWx0ZXJlZCB8fCByZWNvcmRzVG90YWw7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IERhdGFUYWJsZXMgcGFnaW5hdGlvbiBpbmZvIG9uIHRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAganNvbi5kcmF3ID0gZXh0ZW5zaW9uc0luZGV4LmRyYXdDb3VudGVyO1xuICAgICAgICAgICAgICAgICAgICBqc29uLnJlY29yZHNUb3RhbCA9IHJlY29yZHNUb3RhbDtcbiAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzRmlsdGVyZWQgPSByZWNvcmRzRmlsdGVyZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGp1c3QgdGhlIGRhdGEgYXJyYXkgZm9yIERhdGFUYWJsZXMgdG8gcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1cHByZXNzIHRoZSBkZWZhdWx0IGVycm9yIGFsZXJ0XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHJldHJ5IHRpbWVvdXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHVwIHJldHJ5IGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gUHJldmVudCBkZWZhdWx0IGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHN0YXRlU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNEb206ICdydGlwJyxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogcGFnZUxlbmd0aCxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgLy8gc2Nyb2xsZXI6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZToge1xuICAgICAgICAgICAgICAgIC4uLlNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgICAgICBlbXB0eVRhYmxlOiAnICcsICAvLyBFbXB0eSBzdHJpbmcgdG8gaGlkZSBkZWZhdWx0IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICB6ZXJvUmVjb3JkczogJyAnIC8vIEVtcHR5IHN0cmluZyB0byBoaWRlIGRlZmF1bHQgbWVzc2FnZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgRXh0ZW5zaW9ucyByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZW1wbGF0ZVJvdyAgPSAgJCgnLmV4dGVuc2lvbi1yb3ctdHBsJykuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGF2YXRhciA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYXZhdGFyJyk7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hdHRyKCdzcmMnLCBkYXRhLmF2YXRhcik7XG4gICAgICAgICAgICAgICAgJGF2YXRhci5hZnRlcihkYXRhLnVzZXJfdXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubnVtYmVyJykudGV4dChkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5tb2JpbGUgaW5wdXQnKS5hdHRyKCd2YWx1ZScsIGRhdGEubW9iaWxlKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmVtYWlsJykudGV4dChkYXRhLnVzZXJfZW1haWwpO1xuXG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnJlbW92ZUNsYXNzKCdzbWFsbCcpLmFkZENsYXNzKCd0aW55Jyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkZWRpdEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5lZGl0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCRlZGl0QnV0dG9uICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkZWRpdEJ1dHRvbi5hdHRyKCdocmVmJyxgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YS5pZH1gKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRjbGlwYm9hcmRCdXR0b24gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24uYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignaWQnLCBkYXRhLm51bWJlcik7IC8vIFVzZSBleHRlbnNpb24gbnVtYmVyIGFzIElEIGZvciBzdGF0dXMgbW9uaXRvclxuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLWV4dGVuc2lvbi1pZCcsIGRhdGEuaWQpOyAvLyBQcmVzZXJ2ZSBkYXRhYmFzZSBJRCBhcyBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICQocm93KS5hZGRDbGFzcygnZXh0ZW5zaW9uLXJvdycpOyAvLyBBZGQgY2xhc3MgZm9yIHN0YXR1cyBtb25pdG9yXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgZGlzYWJsZWQgY2xhc3MgaWYgZXh0ZW5zaW9uIGlzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChyb3cpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzIGltbWVkaWF0ZWx5IGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3Iuc3RhdHVzQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FjaGVkU3RhdHVzID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnN0YXR1c0NhY2hlW2RhdGEubnVtYmVyXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhY2hlZFN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RhdHVzIGlzIGF2YWlsYWJsZSBpbiBjYWNoZSwgYXBwbHkgaXQgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NvbG9yID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmdldENvbG9yRm9yU3RhdHVzKGNhY2hlZFN0YXR1cy5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkKHJvdykuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0dXNDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkV4dGVuc2lvbiAke2RhdGEubnVtYmVyfTogJHtjYWNoZWRTdGF0dXMuc3RhdHVzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJC5lYWNoKCQoJ3RkJywgJHRlbXBsYXRlUm93KSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbCgkKHZhbHVlKS5odG1sKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJCh2YWx1ZSkuYXR0cignY2xhc3MnKSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIGZvciBtb2JpbGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhYmxlIGlzIGVtcHR5IGFuZCBzaG93IGFwcHJvcHJpYXRlIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBhcGkgPSBuZXcgJC5mbi5kYXRhVGFibGUuQXBpKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGFwaS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRzID0gcGFnZUluZm8ucmVjb3Jkc0Rpc3BsYXkgPiAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gYXBpLnNlYXJjaCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgZHVlIHRvIHNlYXJjaCBmaWx0ZXIgb3IgdHJ1bHkgZW1wdHkgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaFZhbHVlICYmIHNlYXJjaFZhbHVlLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgXCJOb3RoaW5nIGZvdW5kXCIgbWVzc2FnZSBmb3Igc2VhcmNoIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5zaG93Tm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBcIkFkZCBmaXJzdCBlbXBsb3llZVwiIHBsYWNlaG9sZGVyIGZvciBlbXB0eSBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGluIHRoZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtcGxhY2Vob2xkZXIgLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXNlcyB0byBuZXdseSByZW5kZXJlZCByb3dzXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBET00gY2FjaGUgZm9yIG5ldyByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzZXMgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5hcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXNlcyBmb3IgYW55IG5ldyBleHRlbnNpb25zIG5vdCBpbiBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3IHJlY29yZHMgKGxlc3MgdGhhbiBwYWdlIGxlbmd0aClcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkocGFnZUluZm8pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIERpc2FibGUgRGF0YVRhYmxlcyBlcnJvciBhbGVydHMgY29tcGxldGVseVxuICAgICAgICAgICAgZm5Jbml0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlIERhdGFUYWJsZXMgZXJyb3IgZXZlbnQgaGFuZGxlclxuICAgICAgICAgICAgICAgICQuZm4uZGF0YVRhYmxlLmV4dC5lcnJNb2RlID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnN0YXRlLmxvYWRlZCgpO1xuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2VhcmNoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gZXh0ZW5zaW9uc0luZGV4LmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xuXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc2VhcmNoVmFsdWUpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gaW5kZXggc3RhdHVzIG1vbml0b3IgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgYWZ0ZXIgdGFibGUgbG9hZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mIGEgc3BlY2lmaWVkIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gICAgICovXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoJ3RyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gMzkwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGRlbGV0aW5nIGEgcmVjb3JkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGhlIGRhdGF0YWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGRhdGEgY2hhbmdlIGlmIGl0IGV4aXN0cy5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uc0FQSSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEV4dGVuc2lvbnNBUEkuY2JPbkRhdGFDaGFuZ2VkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBkZWxldGlvbiB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVFeHRlbnNpb24pO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGNldCBleHRlbnNpb24gc2VjcmV0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRTZWNyZXQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKGBhLmNsaXBib2FyZFtkYXRhLXZhbHVlPSR7cmVzcG9uc2UuZGF0YS5udW1iZXJ9XWApO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmNvcHlUb0NsaXBib2FyZChyZXNwb25zZS5kYXRhLnNlY3JldCk7XG4gICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBnZXQgc2VjcmV0IHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0dldFNlY3JldCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgaW5wdXQgbWFza3MgZm9yIHZpc3VhbGl6aW5nIGZvcm1hdHRlZCBudW1iZXJzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgdG8gaW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBvbi5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBQcmVwYXJlcyB0aGUgdGFibGUgZm9yIHNvcnRcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICB9XG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yOiAnWzAtOV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgIGxpc3Q6IGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgc2hvd05vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3Rpbmcgbm8tcmVzdWx0cyBtZXNzYWdlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5oaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IG5vIHJlc3VsdHMgbWVzc2FnZVxuICAgICAgICBjb25zdCBub1Jlc3VsdHNIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBpZD1cIm5vLXNlYXJjaC1yZXN1bHRzXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAyZW07XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vU2VhcmNoUmVzdWx0c308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RyeURpZmZlcmVudEtleXdvcmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuYWZ0ZXIobm9SZXN1bHRzSHRtbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgICQoJyNuby1zZWFyY2gtcmVzdWx0cycpLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHBhZ2luYXRpb24gdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgcmVjb3Jkc1xuICAgICAqIEhpZGVzIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3ZXIgcmVjb3JkcyB0aGFuIHRoZSBwYWdlIGxlbmd0aFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYWdlSW5mbyAtIERhdGFUYWJsZXMgcGFnZSBpbmZvIG9iamVjdFxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5KHBhZ2VJbmZvKSB7XG4gICAgICAgIGNvbnN0IHBhZ2luYXRpb25XcmFwcGVyID0gJCgnI2V4dGVuc2lvbnMtdGFibGVfcGFnaW5hdGUnKTtcbiAgICAgICAgY29uc3QgcGFnaW5hdGlvbkluZm8gPSAkKCcjZXh0ZW5zaW9ucy10YWJsZV9pbmZvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gaWYgdG90YWwgcmVjb3JkcyBmaXQgb24gb25lIHBhZ2VcbiAgICAgICAgaWYgKHBhZ2VJbmZvLnJlY29yZHNEaXNwbGF5IDw9IHBhZ2VJbmZvLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuaGlkZSgpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuc2hvdygpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgdGV4dCBwYXNzZWQgYXMgcGFyYW0gdG8gdGhlIHN5c3RlbSBjbGlwYm9hcmRcbiAgICAgKiBDaGVjayBpZiB1c2luZyBIVFRQUyBhbmQgbmF2aWdhdG9yLmNsaXBib2FyZCBpcyBhdmFpbGFibGVcbiAgICAgKiBUaGVuIHVzZXMgc3RhbmRhcmQgY2xpcGJvYXJkIEFQSSwgb3RoZXJ3aXNlIHVzZXMgZmFsbGJhY2tcbiAgICAgKi9cbiAgICBjb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBpZiAod2luZG93LmlzU2VjdXJlQ29udGV4dCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC51bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFB1dCB0ZXh0IHZhcmlhYmxlIGludG8gY2xpcGJvYXJkIGZvciB1bnNlY3VyZWQgY29ubmVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudCAtIFRoZSB0ZXh0IHZhbHVlLlxuICAgICAqL1xuICAgIHVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgICAgICB0ZXh0QXJlYS52YWx1ZT1jb250ZW50O1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRleHRBcmVhKTtcbiAgICAgICAgdGV4dEFyZWEuZm9jdXMoKTt0ZXh0QXJlYS5zZWxlY3QoKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKVxuICAgICAgICB9IGNhdGNoKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGNvcHkgdG8gY2xpcGJvYXJkJywgZXJyKVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgZXh0ZW5zaW9uIHN0YXR1cyBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBTaXBBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2ltcGxpZmllZCBtb2RlIGZvciBpbmRleCBwYWdlIC0gcGFzcyBvcHRpb25zIGFzIGZpcnN0IHBhcmFtLCBjYWxsYmFjayBhcyBzZWNvbmRcbiAgICAgICAgICAgIFNpcEFQSS5nZXRTdGF0dXNlcyh7IHNpbXBsaWZpZWQ6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgdHJpZ2dlciBzdGF0dXMgdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgdHlwZW9mIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGluaXRpYWwgbG9hZCBhcyBjb21wbGV0ZSB0byBhbGxvdyBzdWJzZXF1ZW50IHBhZ2luYXRpb24gcmVxdWVzdHNcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmlzSW5pdGlhbExvYWRDb21wbGV0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlcyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=