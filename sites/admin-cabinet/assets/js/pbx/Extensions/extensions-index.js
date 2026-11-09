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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $extensionsList: null,

  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: null,

  /**
   * The page length selector.
   * @type {jQuery}
   */
  $pageLengthSelector: null,

  /**
   * The page length selector.
   * @type {jQuery}
   */
  $searchExtensionsInput: null,

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
  $body: null,

  /**
   * Initialize the ExtensionsIndex module.
   * Sets up necessary interactivity and features on the page.
   */
  initialize: function initialize() {
    extensionsIndex.$extensionsList = $('#extensions-table');
    extensionsIndex.$globalSearch = $('#global-search');
    extensionsIndex.$pageLengthSelector = $('#page-length-select');
    extensionsIndex.$searchExtensionsInput = $('#search-extensions-input');
    extensionsIndex.$body = $('body'); // Handle avatars with missing src

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

      }, // render.text(): DataTables writes cell data as HTML before createdRow replaces it,
      // so user-controlled values must be escaped here too (GHSA-qhh5-4p3h-6jwx)
      {
        name: 'username',
        data: 'user_username',
        render: $.fn.dataTable.render.text()
      }, {
        name: 'number',
        data: 'number',
        render: $.fn.dataTable.render.text()
      }, {
        name: 'mobile',
        data: 'mobile',
        render: $.fn.dataTable.render.text()
      }, {
        name: 'email',
        data: 'user_email',
        render: $.fn.dataTable.render.text()
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
        $avatar.on('error', function () {
          $(this).off('error');
          $(this).attr('src', "".concat(globalRootUrl, "assets/img/unknownPerson.jpg"));
        }); // Text node, not HTML: the name is user-controlled (GHSA-qhh5-4p3h-6jwx)

        $avatar.after(document.createTextNode(data.user_username || ''));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkZ2xvYmFsU2VhcmNoIiwiJHBhZ2VMZW5ndGhTZWxlY3RvciIsIiRzZWFyY2hFeHRlbnNpb25zSW5wdXQiLCJkYXRhVGFibGUiLCJkcmF3Q291bnRlciIsInJldHJ5VGltZW91dCIsIiRib2R5IiwiaW5pdGlhbGl6ZSIsIiQiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZHJvcGRvd24iLCJvbiIsImUiLCJleHRlbnNpb25JZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJyZW1vdmUiLCJFbXBsb3llZXNBUEkiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwib25DaGFuZ2UiLCJwYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsImxvY2FsU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJzZXRJdGVtIiwicGFnZSIsImxlbiIsImRyYXciLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsIm1pbkNoYXJhY3RlcnMiLCJzZWFyY2hPbkZvY3VzIiwic2VhcmNoRmllbGRzIiwic2hvd05vUmVzdWx0cyIsInNvdXJjZSIsInRpdGxlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VhcmNoQnlFeHRlbnNpb24iLCJ2YWx1ZSIsImV4X1NlYXJjaEJ5TW9iaWxlIiwiZXhfU2VhcmNoQnlFbWFpbCIsImV4X1NlYXJjaEJ5SUQiLCJleF9TZWFyY2hCeUN1c3RvbVBocmFzZSIsIm9uU2VsZWN0IiwicmVzdWx0IiwicmVzcG9uc2UiLCJ2YWwiLCJmb2N1cyIsInNhdmVkUGFnZUxlbmd0aCIsImdldEl0ZW0iLCJzdGF0ZVNhdmUiLCJjb2x1bW5EZWZzIiwiZGVmYXVsdENvbnRlbnQiLCJ0YXJnZXRzIiwicmVzcG9uc2l2ZVByaW9yaXR5IiwicmVzcG9uc2l2ZSIsImRldGFpbHMiLCJjb2x1bW5zIiwibmFtZSIsImRhdGEiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwicmVuZGVyIiwiZm4iLCJ0ZXh0Iiwib3JkZXIiLCJzZXJ2ZXJTaWRlIiwicHJvY2Vzc2luZyIsImFqYXgiLCJ1cmwiLCJ0eXBlIiwiZCIsInJlcXVlc3REYXRhIiwibGltaXQiLCJsZW5ndGgiLCJvZmZzZXQiLCJzdGFydCIsIm9yZGVyQ29sdW1uIiwiY29sdW1uIiwib3JkZXJfYnkiLCJvcmRlcl9kaXJlY3Rpb24iLCJkaXIiLCJ0b1VwcGVyQ2FzZSIsImRhdGFTcmMiLCJqc29uIiwicmVjb3Jkc1RvdGFsIiwicmVjb3Jkc0ZpbHRlcmVkIiwiZXJyb3IiLCJ4aHIiLCJ0ZXh0U3RhdHVzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInNjcm9sbENvbGxhcHNlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCIkdGVtcGxhdGVSb3ciLCJjbG9uZSIsIiRhdmF0YXIiLCJmaW5kIiwiYXZhdGFyIiwib2ZmIiwiYWZ0ZXIiLCJkb2N1bWVudCIsImNyZWF0ZVRleHROb2RlIiwidXNlcl91c2VybmFtZSIsIm1vYmlsZSIsInVzZXJfZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiaWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiZGlzYWJsZWQiLCJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJzdGF0dXNDYWNoZSIsImNhY2hlZFN0YXR1cyIsInN0YXR1c0NvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzQ2VsbCIsInN0YXR1c0h0bWwiLCJodG1sIiwiaW5kZXgiLCJlcSIsImRyYXdDYWxsYmFjayIsInNldHRpbmdzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsImFwaSIsIkFwaSIsInBhZ2VJbmZvIiwiaW5mbyIsImhhc1JlY29yZHMiLCJyZWNvcmRzRGlzcGxheSIsInNlYXJjaFZhbHVlIiwiaGlkZSIsInRyaW0iLCJzaG93Tm9TZWFyY2hSZXN1bHRzTWVzc2FnZSIsInNob3ciLCJoaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSIsInJlZnJlc2hDYWNoZSIsImFwcGx5U3RhdHVzZXNUb1Zpc2libGVSb3dzIiwicmVxdWVzdFN0YXR1c2VzRm9yTmV3RXh0ZW5zaW9ucyIsInRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5IiwicG9wdXAiLCJmbkluaXRDb21wbGV0ZSIsImV4dCIsImVyck1vZGUiLCJzZWFyY2hEZWJvdW5jZVRpbWVyIiwia2V5Q29kZSIsImFwcGx5RmlsdGVyIiwibG9hZGVkIiwiZ2V0UXVlcnlQYXJhbSIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwicGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJnZXQiLCJyb3dIZWlnaHQiLCJmaXJzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwibWF4IiwiZmxvb3IiLCJFeHRlbnNpb25zQVBJIiwiY2JPbkRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImV4X0ltcG9zc2libGVUb0RlbGV0ZUV4dGVuc2lvbiIsImNvcHlUb0NsaXBib2FyZCIsInNlY3JldCIsImV4X0ltcG9zc2libGVUb0dldFNlY3JldCIsIiRlbCIsIm1hc2tzU29ydCIsIklucHV0TWFza1BhdHRlcm5zIiwiaW5wdXRtYXNrcyIsImlucHV0bWFzayIsImRlZmluaXRpb25zIiwidmFsaWRhdG9yIiwiY2FyZGluYWxpdHkiLCJtYXRjaCIsInJlcGxhY2UiLCJsaXN0IiwibGlzdEtleSIsIm5vUmVzdWx0c0h0bWwiLCJleF9Ob1NlYXJjaFJlc3VsdHMiLCJleF9UcnlEaWZmZXJlbnRLZXl3b3JkcyIsInBhZ2luYXRpb25XcmFwcGVyIiwicGFnaW5hdGlvbkluZm8iLCJjb250ZW50IiwiaXNTZWN1cmVDb250ZXh0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidW5zZWN1cmVkQ29weVRvQ2xpcGJvYXJkIiwidGV4dEFyZWEiLCJjcmVhdGVFbGVtZW50IiwiYm9keSIsImFwcGVuZENoaWxkIiwic2VsZWN0IiwiZXhlY0NvbW1hbmQiLCJlcnIiLCJjb25zb2xlIiwicmVtb3ZlQ2hpbGQiLCJnZXRTdGF0dXNlcyIsInNpbXBsaWZpZWQiLCJ1cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyIsImlzSW5pdGlhbExvYWRDb21wbGV0ZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsUUFBUSxFQUFFLElBRFU7O0FBR3BCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBUkc7O0FBVXBCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQWRLOztBQWdCcEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUUsSUFwQkQ7O0FBc0JwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxzQkFBc0IsRUFBRSxJQTFCSjs7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WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2lwQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgSW5wdXRNYXNrUGF0dGVybnMsIFVzZXJNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUsIElucHV0bWFzaywgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLCBFeHRlbnNpb25zQVBJLCBFbXBsb3llZXNBUEkgKi9cblxuXG4vKipcbiAqIFRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlIGhhbmRsZXMgdGhlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBleHRlbnNpb25zIGluZGV4IHBhZ2UuXG4gKlxuICogQG1vZHVsZSBleHRlbnNpb25zSW5kZXhcbiAqL1xuY29uc3QgZXh0ZW5zaW9uc0luZGV4ID0ge1xuICAgIG1hc2tMaXN0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGV4dGVuc2lvbnMgdGFibGUgZWxlbWVudC5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFnZSBsZW5ndGggc2VsZWN0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VhcmNoRXh0ZW5zaW9uc0lucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGFibGUgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERyYXcgY291bnRlciBmb3IgRGF0YVRhYmxlcyBkcmF3IHBhcmFtZXRlclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZHJhd0NvdW50ZXI6IDEsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lb3V0IHJlZmVyZW5jZSBmb3IgcmV0cnkgYXR0ZW1wdHNcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJldHJ5VGltZW91dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBkb2N1bWVudCBib2R5LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJvZHk6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIEV4dGVuc2lvbnNJbmRleCBtb2R1bGUuXG4gICAgICogU2V0cyB1cCBuZWNlc3NhcnkgaW50ZXJhY3Rpdml0eSBhbmQgZmVhdHVyZXMgb24gdGhlIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdCA9ICQoJyNleHRlbnNpb25zLXRhYmxlJyk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoID0gJCgnI2dsb2JhbC1zZWFyY2gnKTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IgPSAkKCcjcGFnZS1sZW5ndGgtc2VsZWN0Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0ID0gJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0Jyk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keSA9ICQoJ2JvZHknKTtcblxuICAgICAgICAvLyBIYW5kbGUgYXZhdGFycyB3aXRoIG1pc3Npbmcgc3JjXG4gICAgICAgICQoJy5hdmF0YXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3NyYycpID09PSAnJykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgYCR7Z2xvYmFsUm9vdFVybH1hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYnVsayBhY3Rpb25zIGRyb3Bkb3duXG4gICAgICAgICQoJyNidWxrLWFjdGlvbnMtZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIFNldCB1cCBkb3VibGUtY2xpY2sgYmVoYXZpb3Igb24gdGhlIGV4dGVuc2lvbiByb3dzIHVzaW5nIGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgY29udGVudC5cbiAgICAgICAgLy8gRXhjbHVkZSBidXR0b25zIGNvbHVtbiB0byBwcmV2ZW50IGFjY2lkZW50YWwgbmF2aWdhdGlvbiB3aGVuIHRyeWluZyB0byBkZWxldGVcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdkYmxjbGljaycsICcuZXh0ZW5zaW9uLXJvdyB0ZDpub3QoOmxhc3QtY2hpbGQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWV4dGVuc2lvbi1pZCcpO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2V4dGVuc2lvbklkfWA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB1cCBkZWxldGUgZnVuY3Rpb25hbGl0eSBvbiBkZWxldGUgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBkYXRhYmFzZSBleHRlbnNpb24gSUQgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBFbXBsb3llZXNBUEkgbWV0aG9kIHRvIGRlbGV0ZSB0aGUgZW1wbG95ZWUgcmVjb3JkLlxuICAgICAgICAgICAgRW1wbG95ZWVzQVBJLmRlbGV0ZVJlY29yZChleHRlbnNpb25JZCwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJEZWxldGVSZWNvcmQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgY29weSBzZWNyZXQgYnV0dG9uIGNsaWNrLlxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGJvZHkub24oJ2NsaWNrJywgJ2EuY2xpcGJvYXJkJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2Rpdi5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBudW1iZXIgZnJvbSB0aGUgY2xvc2VzdCB0YWJsZSByb3cuXG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91cyBBSkFYIG1lc3NhZ2VzLlxuICAgICAgICAgICAgJCgnLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBQYnhBcGkgbWV0aG9kIHRvIGdldCB0aGUgZXh0ZW5zaW9uIHNlY3JldC5cbiAgICAgICAgICAgIFNpcEFQSS5nZXRTZWNyZXQobnVtYmVyLCBleHRlbnNpb25zSW5kZXguY2JBZnRlckdldFNlY3JldCk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzZXQgZGF0YXRhYmxlIHNvcnRzIGFuZCBwYWdlXG4gICAgICAgICQoYGFbaHJlZj0nJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvaW5kZXgvI3Jlc2V0LWNhY2hlJ11gKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKCkuc3RhdGUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcjcmVzZXQtY2FjaGUnO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgdG8gc2F2ZSB0aGUgdXNlcidzIHBhZ2UgbGVuZ3RoIHNlbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSB0YWJsZVxuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZShwYWdlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2VMZW5ndGg9PT0nYXV0bycpe1xuICAgICAgICAgICAgICAgICAgICBwYWdlTGVuZ3RoID0gZXh0ZW5zaW9uc0luZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZXh0ZW5zaW9uc1RhYmxlUGFnZUxlbmd0aCcsIHBhZ2VMZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnBhZ2UubGVuKHBhZ2VMZW5ndGgpLmRyYXcoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBleHRlbnNpb25zSW5kZXguJHBhZ2VMZW5ndGhTZWxlY3Rvci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgdGhlIGV2ZW50IGZyb20gYnViYmxpbmdcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIFNlYXJjaCBjb21wb25lbnRcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKHtcbiAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IDAsXG4gICAgICAgICAgICBzZWFyY2hPbkZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkczogWyd0aXRsZSddLFxuICAgICAgICAgICAgc2hvd05vUmVzdWx0czogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2U6IFtcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFeHRlbnNpb24sIHZhbHVlOiAnbnVtYmVyOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlNb2JpbGUsIHZhbHVlOiAnbW9iaWxlOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFbWFpbCwgdmFsdWU6ICdlbWFpbDonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5SUQsIHZhbHVlOiAnaWQ6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUN1c3RvbVBocmFzZSwgdmFsdWU6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb25TZWxlY3Q6IGZ1bmN0aW9uKHJlc3VsdCwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ2hpZGUgcmVzdWx0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIHdoZW4geW91IGNsaWNrIG9uIHRoZSBpY29uXG4gICAgICAgICQoJyNzZWFyY2gtaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2guZm9jdXMoKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCgncXVlcnknKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFNldCB1cCB0aGUgRGF0YVRhYmxlIG9uIHRoZSBleHRlbnNpb25zIGxpc3QuXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpe1xuXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gXCIjcmVzZXQtY2FjaGVcIikge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ0RhdGFUYWJsZXNfZXh0ZW5zaW9ucy10YWJsZV8vYWRtaW4tY2FiaW5ldC9leHRlbnNpb25zL2luZGV4LycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSB1c2VyJ3Mgc2F2ZWQgdmFsdWUgb3IgdXNlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgdmFsdWUgaWYgbm9uZSBleGlzdHNcbiAgICAgICAgY29uc3Qgc2F2ZWRQYWdlTGVuZ3RoID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnKTtcbiAgICAgICAgY29uc3QgcGFnZUxlbmd0aCA9IHNhdmVkUGFnZUxlbmd0aCA/IHNhdmVkUGFnZUxlbmd0aCA6IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoe1xuICAgICAgICAgICAgLy8gRW5hYmxlIHN0YXRlIHNhdmluZyB0byBhdXRvbWF0aWNhbGx5IHNhdmUgYW5kIHJlc3RvcmUgdGhlIHRhYmxlJ3Mgc3RhdGVcbiAgICAgICAgICAgIHN0YXRlU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgICAgICB7IGRlZmF1bHRDb250ZW50OiBcIi1cIiwgIHRhcmdldHM6IFwiX2FsbFwifSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDB9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogMX0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDMsICB0YXJnZXRzOiAyfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNCwgIHRhcmdldHM6IDN9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiA1LCAgdGFyZ2V0czogNH0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAtMX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzcG9uc2l2ZToge1xuICAgICAgICAgICAgICAgIGRldGFpbHM6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3N0YXR1cycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIHJlbmRlci50ZXh0KCk6IERhdGFUYWJsZXMgd3JpdGVzIGNlbGwgZGF0YSBhcyBIVE1MIGJlZm9yZSBjcmVhdGVkUm93IHJlcGxhY2VzIGl0LFxuICAgICAgICAgICAgICAgIC8vIHNvIHVzZXItY29udHJvbGxlZCB2YWx1ZXMgbXVzdCBiZSBlc2NhcGVkIGhlcmUgdG9vIChHSFNBLXFoaDUtNHAzaC02and4KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3VzZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6ICQuZm4uZGF0YVRhYmxlLnJlbmRlci50ZXh0KCksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiAkLmZuLmRhdGFUYWJsZS5yZW5kZXIudGV4dCgpLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogJC5mbi5kYXRhVGFibGUucmVuZGVyLnRleHQoKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ3VzZXJfZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6ICQuZm4uZGF0YVRhYmxlLnJlbmRlci50ZXh0KCksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdidXR0b25zJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFtbMSwgJ2FzYyddXSxcbiAgICAgICAgICAgIHNlcnZlclNpZGU6IHRydWUsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAvcGJ4Y29yZS9hcGkvdjMvZW1wbG95ZWVzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluY3JlbWVudCBkcmF3IGNvdW50ZXIgZm9yIHRoaXMgcmVxdWVzdFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZHJhd0NvdW50ZXIgPSBkLmRyYXcgfHwgKytleHRlbnNpb25zSW5kZXguZHJhd0NvdW50ZXI7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gRGF0YVRhYmxlcyByZXF1ZXN0IHRvIG91ciBSRVNUIEFQSSBmb3JtYXQgKHF1ZXJ5IHBhcmFtcyBmb3IgR0VUKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogZC5zZWFyY2gudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDogZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzb3J0aW5nIGluZm9ybWF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChkLm9yZGVyICYmIGQub3JkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJDb2x1bW4gPSBkLmNvbHVtbnNbZC5vcmRlclswXS5jb2x1bW5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9yZGVyQ29sdW1uICYmIG9yZGVyQ29sdW1uLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vcmRlcl9ieSA9IG9yZGVyQ29sdW1uLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdERhdGEub3JkZXJfZGlyZWN0aW9uID0gZC5vcmRlclswXS5kaXIudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3REYXRhO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcGFnaW5hdGlvbiBmb3JtYXQgZnJvbSBFbXBsb3llZXMgQVBJXG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zOiB7ZGF0YToge2RhdGE6IFsuLi5dLCByZWNvcmRzVG90YWw6IG4sIHJlY29yZHNGaWx0ZXJlZDogbn19XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGFuZCBwYWdpbmF0aW9uIGluZm8gZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGpzb24uZGF0YT8uZGF0YSB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3Jkc1RvdGFsID0ganNvbi5kYXRhPy5yZWNvcmRzVG90YWwgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3Jkc0ZpbHRlcmVkID0ganNvbi5kYXRhPy5yZWNvcmRzRmlsdGVyZWQgfHwgcmVjb3Jkc1RvdGFsO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gaW5mbyBvbiB0aGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIGpzb24uZHJhdyA9IGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSByZWNvcmRzVG90YWw7XG4gICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcmVjb3Jkc0ZpbHRlcmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybiBqdXN0IHRoZSBkYXRhIGFycmF5IGZvciBEYXRhVGFibGVzIHRvIHByb2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oeGhyLCB0ZXh0U3RhdHVzLCBlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdXBwcmVzcyB0aGUgZGVmYXVsdCBlcnJvciBhbGVydFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyByZXRyeSB0aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zSW5kZXgucmV0cnlUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB1cCByZXRyeSBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLmFqYXgucmVsb2FkKG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFByZXZlbnQgZGVmYXVsdCBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICAvLyBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBzRG9tOiAncnRpcCcsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IHBhZ2VMZW5ndGgsXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIC8vIHNjcm9sbGVyOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IHtcbiAgICAgICAgICAgICAgICAuLi5TZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAgICAgZW1wdHlUYWJsZTogJyAnLCAgLy8gRW1wdHkgc3RyaW5nIHRvIGhpZGUgZGVmYXVsdCBtZXNzYWdlXG4gICAgICAgICAgICAgICAgemVyb1JlY29yZHM6ICcgJyAvLyBFbXB0eSBzdHJpbmcgdG8gaGlkZSBkZWZhdWx0IG1lc3NhZ2VcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcGxhdGVSb3cgID0gICQoJy5leHRlbnNpb24tcm93LXRwbCcpLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhdmF0YXIgPSAkdGVtcGxhdGVSb3cuZmluZCgnLmF2YXRhcicpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIuYXR0cignc3JjJywgZGF0YS5hdmF0YXIpO1xuICAgICAgICAgICAgICAgICRhdmF0YXIub24oJ2Vycm9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykub2ZmKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIFRleHQgbm9kZSwgbm90IEhUTUw6IHRoZSBuYW1lIGlzIHVzZXItY29udHJvbGxlZCAoR0hTQS1xaGg1LTRwM2gtNmp3eClcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmFmdGVyKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEudXNlcl91c2VybmFtZSB8fCAnJykpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcubnVtYmVyJykudGV4dChkYXRhLm51bWJlcik7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5tb2JpbGUgaW5wdXQnKS5hdHRyKCd2YWx1ZScsIGRhdGEubW9iaWxlKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmVtYWlsJykudGV4dChkYXRhLnVzZXJfZW1haWwpO1xuXG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnJlbW92ZUNsYXNzKCdzbWFsbCcpLmFkZENsYXNzKCd0aW55Jyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkZWRpdEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5lZGl0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCRlZGl0QnV0dG9uICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkZWRpdEJ1dHRvbi5hdHRyKCdocmVmJyxgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YS5pZH1gKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdXR0b24gPSAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zIC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRjbGlwYm9hcmRCdXR0b24gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24uYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS12YWx1ZScsIGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkKHJvdykuYXR0cignaWQnLCBkYXRhLm51bWJlcik7IC8vIFVzZSBleHRlbnNpb24gbnVtYmVyIGFzIElEIGZvciBzdGF0dXMgbW9uaXRvclxuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLWV4dGVuc2lvbi1pZCcsIGRhdGEuaWQpOyAvLyBQcmVzZXJ2ZSBkYXRhYmFzZSBJRCBhcyBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICQocm93KS5hZGRDbGFzcygnZXh0ZW5zaW9uLXJvdycpOyAvLyBBZGQgY2xhc3MgZm9yIHN0YXR1cyBtb25pdG9yXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgZGlzYWJsZWQgY2xhc3MgaWYgZXh0ZW5zaW9uIGlzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChyb3cpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzIGltbWVkaWF0ZWx5IGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3Iuc3RhdHVzQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FjaGVkU3RhdHVzID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnN0YXR1c0NhY2hlW2RhdGEubnVtYmVyXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhY2hlZFN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RhdHVzIGlzIGF2YWlsYWJsZSBpbiBjYWNoZSwgYXBwbHkgaXQgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NvbG9yID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmdldENvbG9yRm9yU3RhdHVzKGNhY2hlZFN0YXR1cy5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkKHJvdykuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0dXNDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkV4dGVuc2lvbiAke2RhdGEubnVtYmVyfTogJHtjYWNoZWRTdGF0dXMuc3RhdHVzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJC5lYWNoKCQoJ3RkJywgJHRlbXBsYXRlUm93KSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoaW5kZXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbCgkKHZhbHVlKS5odG1sKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJCh2YWx1ZSkuYXR0cignY2xhc3MnKSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRHJhdyBldmVudCAtIGZpcmVkIG9uY2UgdGhlIHRhYmxlIGhhcyBjb21wbGV0ZWQgYSBkcmF3LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbnB1dCBtYXNrIGZvciBtb2JpbGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhYmxlIGlzIGVtcHR5IGFuZCBzaG93IGFwcHJvcHJpYXRlIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBhcGkgPSBuZXcgJC5mbi5kYXRhVGFibGUuQXBpKHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGFwaS5wYWdlLmluZm8oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNSZWNvcmRzID0gcGFnZUluZm8ucmVjb3Jkc0Rpc3BsYXkgPiAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gYXBpLnNlYXJjaCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghaGFzUmVjb3Jkcykge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgZHVlIHRvIHNlYXJjaCBmaWx0ZXIgb3IgdHJ1bHkgZW1wdHkgZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaFZhbHVlICYmIHNlYXJjaFZhbHVlLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgXCJOb3RoaW5nIGZvdW5kXCIgbWVzc2FnZSBmb3Igc2VhcmNoIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5zaG93Tm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBcIkFkZCBmaXJzdCBlbXBsb3llZVwiIHBsYWNlaG9sZGVyIGZvciBlbXB0eSBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGluIHRoZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnMtcGxhY2Vob2xkZXIgLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXNlcyB0byBuZXdseSByZW5kZXJlZCByb3dzXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBET00gY2FjaGUgZm9yIG5ldyByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzZXMgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5hcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXNlcyBmb3IgYW55IG5ldyBleHRlbnNpb25zIG5vdCBpbiBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3IHJlY29yZHMgKGxlc3MgdGhhbiBwYWdlIGxlbmd0aClcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkocGFnZUluZm8pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIERpc2FibGUgRGF0YVRhYmxlcyBlcnJvciBhbGVydHMgY29tcGxldGVseVxuICAgICAgICAgICAgZm5Jbml0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlIERhdGFUYWJsZXMgZXJyb3IgZXZlbnQgaGFuZGxlclxuICAgICAgICAgICAgICAgICQuZm4uZGF0YVRhYmxlLmV4dC5lcnJNb2RlID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnN0YXRlLmxvYWRlZCgpO1xuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2VhcmNoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gZXh0ZW5zaW9uc0luZGV4LmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xuXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc2VhcmNoVmFsdWUpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gaW5kZXggc3RhdHVzIG1vbml0b3IgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgYWZ0ZXIgdGFibGUgbG9hZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mIGEgc3BlY2lmaWVkIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gICAgICovXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoJ3RyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gMzkwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGRlbGV0aW5nIGEgcmVjb3JkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGhlIGRhdGF0YWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGRhdGEgY2hhbmdlIGlmIGl0IGV4aXN0cy5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uc0FQSSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEV4dGVuc2lvbnNBUEkuY2JPbkRhdGFDaGFuZ2VkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBkZWxldGlvbiB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVFeHRlbnNpb24pO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGNldCBleHRlbnNpb24gc2VjcmV0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRTZWNyZXQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKGBhLmNsaXBib2FyZFtkYXRhLXZhbHVlPSR7cmVzcG9uc2UuZGF0YS5udW1iZXJ9XWApO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmNvcHlUb0NsaXBib2FyZChyZXNwb25zZS5kYXRhLnNlY3JldCk7XG4gICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBnZXQgc2VjcmV0IHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0dldFNlY3JldCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgaW5wdXQgbWFza3MgZm9yIHZpc3VhbGl6aW5nIGZvcm1hdHRlZCBudW1iZXJzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgdG8gaW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBvbi5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBQcmVwYXJlcyB0aGUgdGFibGUgZm9yIHNvcnRcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICB9XG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yOiAnWzAtOV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgIGxpc3Q6IGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgc2hvd05vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3Rpbmcgbm8tcmVzdWx0cyBtZXNzYWdlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5oaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IG5vIHJlc3VsdHMgbWVzc2FnZVxuICAgICAgICBjb25zdCBub1Jlc3VsdHNIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBpZD1cIm5vLXNlYXJjaC1yZXN1bHRzXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAyZW07XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vU2VhcmNoUmVzdWx0c308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RyeURpZmZlcmVudEtleXdvcmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuYWZ0ZXIobm9SZXN1bHRzSHRtbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgICQoJyNuby1zZWFyY2gtcmVzdWx0cycpLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHBhZ2luYXRpb24gdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgcmVjb3Jkc1xuICAgICAqIEhpZGVzIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3ZXIgcmVjb3JkcyB0aGFuIHRoZSBwYWdlIGxlbmd0aFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYWdlSW5mbyAtIERhdGFUYWJsZXMgcGFnZSBpbmZvIG9iamVjdFxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5KHBhZ2VJbmZvKSB7XG4gICAgICAgIGNvbnN0IHBhZ2luYXRpb25XcmFwcGVyID0gJCgnI2V4dGVuc2lvbnMtdGFibGVfcGFnaW5hdGUnKTtcbiAgICAgICAgY29uc3QgcGFnaW5hdGlvbkluZm8gPSAkKCcjZXh0ZW5zaW9ucy10YWJsZV9pbmZvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gaWYgdG90YWwgcmVjb3JkcyBmaXQgb24gb25lIHBhZ2VcbiAgICAgICAgaWYgKHBhZ2VJbmZvLnJlY29yZHNEaXNwbGF5IDw9IHBhZ2VJbmZvLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuaGlkZSgpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuc2hvdygpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgdGV4dCBwYXNzZWQgYXMgcGFyYW0gdG8gdGhlIHN5c3RlbSBjbGlwYm9hcmRcbiAgICAgKiBDaGVjayBpZiB1c2luZyBIVFRQUyBhbmQgbmF2aWdhdG9yLmNsaXBib2FyZCBpcyBhdmFpbGFibGVcbiAgICAgKiBUaGVuIHVzZXMgc3RhbmRhcmQgY2xpcGJvYXJkIEFQSSwgb3RoZXJ3aXNlIHVzZXMgZmFsbGJhY2tcbiAgICAgKi9cbiAgICBjb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBpZiAod2luZG93LmlzU2VjdXJlQ29udGV4dCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC51bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFB1dCB0ZXh0IHZhcmlhYmxlIGludG8gY2xpcGJvYXJkIGZvciB1bnNlY3VyZWQgY29ubmVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudCAtIFRoZSB0ZXh0IHZhbHVlLlxuICAgICAqL1xuICAgIHVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgICAgICB0ZXh0QXJlYS52YWx1ZT1jb250ZW50O1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRleHRBcmVhKTtcbiAgICAgICAgdGV4dEFyZWEuZm9jdXMoKTt0ZXh0QXJlYS5zZWxlY3QoKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKVxuICAgICAgICB9IGNhdGNoKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGNvcHkgdG8gY2xpcGJvYXJkJywgZXJyKVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgZXh0ZW5zaW9uIHN0YXR1cyBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBTaXBBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2ltcGxpZmllZCBtb2RlIGZvciBpbmRleCBwYWdlIC0gcGFzcyBvcHRpb25zIGFzIGZpcnN0IHBhcmFtLCBjYWxsYmFjayBhcyBzZWNvbmRcbiAgICAgICAgICAgIFNpcEFQSS5nZXRTdGF0dXNlcyh7IHNpbXBsaWZpZWQ6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgdHJpZ2dlciBzdGF0dXMgdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRhdGEgJiYgdHlwZW9mIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGluaXRpYWwgbG9hZCBhcyBjb21wbGV0ZSB0byBhbGxvdyBzdWJzZXF1ZW50IHBhZ2luYXRpb24gcmVxdWVzdHNcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmlzSW5pdGlhbExvYWRDb21wbGV0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlcyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=