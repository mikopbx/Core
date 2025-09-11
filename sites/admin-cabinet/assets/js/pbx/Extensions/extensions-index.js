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

    extensionsIndex.initializeDataTable(); // Move the "Add New" button to the first eight-column div.

    $('#add-new-button').appendTo($('div.eight.column:eq(0)')); // Set up double-click behavior on the extension rows using delegation for dynamic content.
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
          // Handle new pagination format from Employees API
          // API returns: {data: {data: [...], recordsTotal: n, recordsFiltered: n}}
          var data, recordsTotal, recordsFiltered;

          if (json.data && json.data.data && Array.isArray(json.data.data)) {
            // New pagination format
            data = json.data.data;
            recordsTotal = json.data.recordsTotal || data.length;
            recordsFiltered = json.data.recordsFiltered || recordsTotal;
          } else {
            // Fallback to old format for compatibility
            data = json.data || [];
            recordsTotal = data.length;
            recordsFiltered = data.length;
          } // Set DataTables pagination info on the response object


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
            $('#extensions-placeholder').show();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc0luZGV4IiwibWFza0xpc3QiLCIkZXh0ZW5zaW9uc0xpc3QiLCIkIiwiJGdsb2JhbFNlYXJjaCIsIiRwYWdlTGVuZ3RoU2VsZWN0b3IiLCIkc2VhcmNoRXh0ZW5zaW9uc0lucHV0IiwiZGF0YVRhYmxlIiwiZHJhd0NvdW50ZXIiLCJyZXRyeVRpbWVvdXQiLCIkYm9keSIsImluaXRpYWxpemUiLCJlYWNoIiwiYXR0ciIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiYXBwZW5kVG8iLCJvbiIsImUiLCJleHRlbnNpb25JZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJyZW1vdmUiLCJFbXBsb3llZXNBUEkiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwibnVtYmVyIiwiU2lwQVBJIiwiZ2V0U2VjcmV0IiwiY2JBZnRlckdldFNlY3JldCIsIkRhdGFUYWJsZSIsInN0YXRlIiwiY2xlYXIiLCJoYXNoIiwicmVsb2FkIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInBhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwibG9jYWxTdG9yYWdlIiwicmVtb3ZlSXRlbSIsInNldEl0ZW0iLCJwYWdlIiwibGVuIiwiZHJhdyIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwic2VhcmNoIiwibWluQ2hhcmFjdGVycyIsInNlYXJjaE9uRm9jdXMiLCJzZWFyY2hGaWVsZHMiLCJzaG93Tm9SZXN1bHRzIiwic291cmNlIiwidGl0bGUiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9TZWFyY2hCeUV4dGVuc2lvbiIsInZhbHVlIiwiZXhfU2VhcmNoQnlNb2JpbGUiLCJleF9TZWFyY2hCeUVtYWlsIiwiZXhfU2VhcmNoQnlJRCIsImV4X1NlYXJjaEJ5Q3VzdG9tUGhyYXNlIiwib25TZWxlY3QiLCJyZXN1bHQiLCJyZXNwb25zZSIsInZhbCIsImZvY3VzIiwic2F2ZWRQYWdlTGVuZ3RoIiwiZ2V0SXRlbSIsInN0YXRlU2F2ZSIsImNvbHVtbkRlZnMiLCJkZWZhdWx0Q29udGVudCIsInRhcmdldHMiLCJyZXNwb25zaXZlUHJpb3JpdHkiLCJyZXNwb25zaXZlIiwiZGV0YWlscyIsImNvbHVtbnMiLCJuYW1lIiwiZGF0YSIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsInNlcnZlclNpZGUiLCJwcm9jZXNzaW5nIiwiYWpheCIsInVybCIsInR5cGUiLCJkIiwicmVxdWVzdERhdGEiLCJsaW1pdCIsImxlbmd0aCIsIm9mZnNldCIsInN0YXJ0Iiwib3JkZXJDb2x1bW4iLCJjb2x1bW4iLCJvcmRlcl9ieSIsIm9yZGVyX2RpcmVjdGlvbiIsImRpciIsInRvVXBwZXJDYXNlIiwiZGF0YVNyYyIsImpzb24iLCJyZWNvcmRzVG90YWwiLCJyZWNvcmRzRmlsdGVyZWQiLCJBcnJheSIsImlzQXJyYXkiLCJlcnJvciIsInhociIsInRleHRTdGF0dXMiLCJjb25zb2xlIiwibG9nIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInNjcm9sbENvbGxhcHNlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImVtcHR5VGFibGUiLCJ6ZXJvUmVjb3JkcyIsImNyZWF0ZWRSb3ciLCJyb3ciLCIkdGVtcGxhdGVSb3ciLCJjbG9uZSIsIiRhdmF0YXIiLCJmaW5kIiwiYXZhdGFyIiwiYWZ0ZXIiLCJ1c2VyX3VzZXJuYW1lIiwidGV4dCIsIm1vYmlsZSIsInVzZXJfZW1haWwiLCJyZW1vdmVDbGFzcyIsIiRlZGl0QnV0dG9uIiwidW5kZWZpbmVkIiwiaWQiLCIkY2xpcGJvYXJkQnV0dG9uIiwiZGlzYWJsZWQiLCJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJzdGF0dXNDYWNoZSIsImNhY2hlZFN0YXR1cyIsInN0YXR1c0NvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzQ2VsbCIsInN0YXR1c0h0bWwiLCJodG1sIiwiaW5kZXgiLCJlcSIsImRyYXdDYWxsYmFjayIsInNldHRpbmdzIiwiaW5pdGlhbGl6ZUlucHV0bWFzayIsImFwaSIsImZuIiwiQXBpIiwicGFnZUluZm8iLCJpbmZvIiwiaGFzUmVjb3JkcyIsInJlY29yZHNEaXNwbGF5Iiwic2VhcmNoVmFsdWUiLCJoaWRlIiwidHJpbSIsInNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwic2hvdyIsImhpZGVOb1NlYXJjaFJlc3VsdHNNZXNzYWdlIiwicmVmcmVzaENhY2hlIiwiYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MiLCJyZXF1ZXN0U3RhdHVzZXNGb3JOZXdFeHRlbnNpb25zIiwidG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkiLCJwb3B1cCIsImZuSW5pdENvbXBsZXRlIiwiZXh0IiwiZXJyTW9kZSIsInNlYXJjaERlYm91bmNlVGltZXIiLCJrZXlDb2RlIiwiYXBwbHlGaWx0ZXIiLCJsb2FkZWQiLCJnZXRRdWVyeVBhcmFtIiwicmVxdWVzdEluaXRpYWxTdGF0dXMiLCJwYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImdldCIsInJvd0hlaWdodCIsImZpcnN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsIk1hdGgiLCJtYXgiLCJmbG9vciIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlRXh0ZW5zaW9uIiwiY29weVRvQ2xpcGJvYXJkIiwic2VjcmV0IiwiZXhfSW1wb3NzaWJsZVRvR2V0U2VjcmV0IiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5Iiwibm9SZXN1bHRzSHRtbCIsImV4X05vU2VhcmNoUmVzdWx0cyIsImV4X1RyeURpZmZlcmVudEtleXdvcmRzIiwicGFnaW5hdGlvbldyYXBwZXIiLCJwYWdpbmF0aW9uSW5mbyIsImNvbnRlbnQiLCJpc1NlY3VyZUNvbnRleHQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ1bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQiLCJ0ZXh0QXJlYSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsInNlbGVjdCIsImV4ZWNDb21tYW5kIiwiZXJyIiwicmVtb3ZlQ2hpbGQiLCJFeHRlbnNpb25zQVBJIiwiZ2V0U3RhdHVzZXMiLCJzaW1wbGlmaWVkIiwidXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRSxJQURVOztBQUdwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQVBFOztBQVNwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQWJJOztBQWVwQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxtQkFBbUIsRUFBQ0YsQ0FBQyxDQUFDLHFCQUFELENBbkJEOztBQXFCcEI7QUFDSjtBQUNB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QWQsQ0FBMEI7QUFBRUMsUUFBQUEsVUFBVSxFQUFFO0FBQWQsT0FBMUIsRUFBZ0QsVUFBQzVLLFFBQUQsRUFBYztBQUMxRDtBQUNBLFlBQUlBLFFBQVEsSUFBSUEsUUFBUSxDQUFDYyxJQUFyQixJQUE2QixPQUFPNkQsMkJBQVAsS0FBdUMsV0FBeEUsRUFBcUY7QUFDakZBLFVBQUFBLDJCQUEyQixDQUFDa0csMEJBQTVCLENBQXVEN0ssUUFBUSxDQUFDYyxJQUFoRTtBQUNIO0FBQ0osT0FMRDtBQU1IO0FBQ0o7QUFqcEJtQixDQUF4QjtBQW9wQkE7QUFDQTtBQUNBOztBQUNBOUUsQ0FBQyxDQUFDa08sUUFBRCxDQUFELENBQVlZLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmpQLEVBQUFBLGVBQWUsQ0FBQ1csVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNpcEFQSSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIElucHV0TWFza1BhdHRlcm5zLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBJbnB1dG1hc2ssIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciwgRXh0ZW5zaW9uc0FQSSwgRW1wbG95ZWVzQVBJICovXG5cblxuLyoqXG4gKiBUaGUgRXh0ZW5zaW9uc0luZGV4IG1vZHVsZSBoYW5kbGVzIHRoZSBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9ucyBpbmRleCBwYWdlLlxuICpcbiAqIEBtb2R1bGUgZXh0ZW5zaW9uc0luZGV4XG4gKi9cbmNvbnN0IGV4dGVuc2lvbnNJbmRleCA9IHtcbiAgICBtYXNrTGlzdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBleHRlbnNpb25zIHRhYmxlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc0xpc3Q6ICQoJyNleHRlbnNpb25zLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYWdlIGxlbmd0aCBzZWxlY3Rvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYWdlTGVuZ3RoU2VsZWN0b3I6JCgnI3BhZ2UtbGVuZ3RoLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhZ2UgbGVuZ3RoIHNlbGVjdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlYXJjaEV4dGVuc2lvbnNJbnB1dDogJCgnI3NlYXJjaC1leHRlbnNpb25zLWlucHV0JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGF0YSB0YWJsZSBvYmplY3QuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyBjb3VudGVyIGZvciBEYXRhVGFibGVzIGRyYXcgcGFyYW1ldGVyXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBkcmF3Q291bnRlcjogMSxcblxuICAgIC8qKlxuICAgICAqIFRpbWVvdXQgcmVmZXJlbmNlIGZvciByZXRyeSBhdHRlbXB0c1xuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgcmV0cnlUaW1lb3V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRvY3VtZW50IGJvZHkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYm9keTogJCgnYm9keScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBFeHRlbnNpb25zSW5kZXggbW9kdWxlLlxuICAgICAqIFNldHMgdXAgbmVjZXNzYXJ5IGludGVyYWN0aXZpdHkgYW5kIGZlYXR1cmVzIG9uIHRoZSBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSGFuZGxlIGF2YXRhcnMgd2l0aCBtaXNzaW5nIHNyY1xuICAgICAgICAkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIGAke2dsb2JhbFJvb3RVcmx9YXNzZXRzL2ltZy91bmtub3duUGVyc29uLmpwZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgICAgICBleHRlbnNpb25zSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdi5cbiAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblxuICAgICAgICAvLyBTZXQgdXAgZG91YmxlLWNsaWNrIGJlaGF2aW9yIG9uIHRoZSBleHRlbnNpb24gcm93cyB1c2luZyBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGNvbnRlbnQuXG4gICAgICAgIC8vIEV4Y2x1ZGUgYnV0dG9ucyBjb2x1bW4gdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gd2hlbiB0cnlpbmcgdG8gZGVsZXRlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kYm9keS5vbignZGJsY2xpY2snLCAnLmV4dGVuc2lvbi1yb3cgdGQ6bm90KDpsYXN0LWNoaWxkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtleHRlbnNpb25JZH1gO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGZ1bmN0aW9uYWxpdHkgb24gZGVsZXRlIGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgZGF0YWJhc2UgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgRW1wbG95ZWVzQVBJIG1ldGhvZCB0byBkZWxldGUgdGhlIGVtcGxveWVlIHJlY29yZC5cbiAgICAgICAgICAgIEVtcGxveWVlc0FQSS5kZWxldGVSZWNvcmQoZXh0ZW5zaW9uSWQsIGV4dGVuc2lvbnNJbmRleC5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHVwIGNvcHkgc2VjcmV0IGJ1dHRvbiBjbGljay5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRib2R5Lm9uKCdjbGljaycsICdhLmNsaXBib2FyZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbnVtYmVyIGZyb20gdGhlIGNsb3Nlc3QgdGFibGUgcm93LlxuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgQUpBWCBtZXNzYWdlcy5cbiAgICAgICAgICAgICQoJy5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgUGJ4QXBpIG1ldGhvZCB0byBnZXQgdGhlIGV4dGVuc2lvbiBzZWNyZXQuXG4gICAgICAgICAgICBTaXBBUEkuZ2V0U2VjcmV0KG51bWJlciwgZXh0ZW5zaW9uc0luZGV4LmNiQWZ0ZXJHZXRTZWNyZXQpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlc2V0IGRhdGF0YWJsZSBzb3J0cyBhbmQgcGFnZVxuICAgICAgICAkKGBhW2hyZWY9JyR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2luZGV4LyNyZXNldC1jYWNoZSddYCkub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LkRhdGFUYWJsZSgpLnN0YXRlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnI3Jlc2V0LWNhY2hlJztcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIHRvIHNhdmUgdGhlIHVzZXIncyBwYWdlIGxlbmd0aCBzZWxlY3Rpb24gYW5kIHVwZGF0ZSB0aGUgdGFibGVcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3IuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UocGFnZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChwYWdlTGVuZ3RoPT09J2F1dG8nKXtcbiAgICAgICAgICAgICAgICAgICAgcGFnZUxlbmd0aCA9IGV4dGVuc2lvbnNJbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2V4dGVuc2lvbnNUYWJsZVBhZ2VMZW5ndGgnLCBwYWdlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihwYWdlTGVuZ3RoKS5kcmF3KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRwYWdlTGVuZ3RoU2VsZWN0b3Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBTZWFyY2ggY29tcG9uZW50XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kc2VhcmNoRXh0ZW5zaW9uc0lucHV0LnNlYXJjaCh7XG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLFxuICAgICAgICAgICAgc2VhcmNoT25Gb2N1czogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hGaWVsZHM6IFsndGl0bGUnXSxcbiAgICAgICAgICAgIHNob3dOb1Jlc3VsdHM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlOiBbXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RXh0ZW5zaW9uLCB2YWx1ZTogJ251bWJlcjonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5TW9iaWxlLCB2YWx1ZTogJ21vYmlsZTonIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RW1haWwsIHZhbHVlOiAnZW1haWw6JyB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TZWFyY2hCeUlELCB2YWx1ZTogJ2lkOicgfSxcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlDdXN0b21QaHJhc2UsIHZhbHVlOiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9uU2VsZWN0OiBmdW5jdGlvbihyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LiRzZWFyY2hFeHRlbnNpb25zSW5wdXQuc2VhcmNoKCdoaWRlIHJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCB3aGVuIHlvdSBjbGljayBvbiB0aGUgaWNvblxuICAgICAgICAkKCcjc2VhcmNoLWljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmZvY3VzKCk7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJHNlYXJjaEV4dGVuc2lvbnNJbnB1dC5zZWFyY2goJ3F1ZXJ5Jyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBTZXQgdXAgdGhlIERhdGFUYWJsZSBvbiB0aGUgZXh0ZW5zaW9ucyBsaXN0LlxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcblxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI3Jlc2V0LWNhY2hlXCIpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdEYXRhVGFibGVzX2V4dGVuc2lvbnMtdGFibGVfL2FkbWluLWNhYmluZXQvZXh0ZW5zaW9ucy9pbmRleC8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgdXNlcidzIHNhdmVkIHZhbHVlIG9yIHVzZSB0aGUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHZhbHVlIGlmIG5vbmUgZXhpc3RzXG4gICAgICAgIGNvbnN0IHNhdmVkUGFnZUxlbmd0aCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdleHRlbnNpb25zVGFibGVQYWdlTGVuZ3RoJyk7XG4gICAgICAgIGNvbnN0IHBhZ2VMZW5ndGggPSBzYXZlZFBhZ2VMZW5ndGggPyBzYXZlZFBhZ2VMZW5ndGggOiBleHRlbnNpb25zSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZXh0ZW5zaW9uc0xpc3QuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBzdGF0ZSBzYXZpbmcgdG8gYXV0b21hdGljYWxseSBzYXZlIGFuZCByZXN0b3JlIHRoZSB0YWJsZSdzIHN0YXRlXG4gICAgICAgICAgICBzdGF0ZVNhdmU6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAgICAgICAgeyBkZWZhdWx0Q29udGVudDogXCItXCIsICB0YXJnZXRzOiBcIl9hbGxcIn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDEsICB0YXJnZXRzOiAwfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogMSwgIHRhcmdldHM6IDF9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAzLCAgdGFyZ2V0czogMn0sXG4gICAgICAgICAgICAgICAgeyByZXNwb25zaXZlUHJpb3JpdHk6IDQsICB0YXJnZXRzOiAzfSxcbiAgICAgICAgICAgICAgICB7IHJlc3BvbnNpdmVQcmlvcml0eTogNSwgIHRhcmdldHM6IDR9LFxuICAgICAgICAgICAgICAgIHsgcmVzcG9uc2l2ZVByaW9yaXR5OiAxLCAgdGFyZ2V0czogLTF9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc3BvbnNpdmU6IHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdzdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ21vYmlsZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICd1c2VyX2VtYWlsJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2J1dHRvbnMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1sxLCAnYXNjJ11dLFxuICAgICAgICAgICAgc2VydmVyU2lkZTogdHJ1ZSxcbiAgICAgICAgICAgIHByb2Nlc3Npbmc6IGZhbHNlLFxuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogYC9wYnhjb3JlL2FwaS92My9lbXBsb3llZXNgLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGRyYXcgY291bnRlciBmb3IgdGhpcyByZXF1ZXN0XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlciA9IGQuZHJhdyB8fCArK2V4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBEYXRhVGFibGVzIHJlcXVlc3QgdG8gb3VyIFJFU1QgQVBJIGZvcm1hdCAocXVlcnkgcGFyYW1zIGZvciBHRVQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoOiBkLnNlYXJjaC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiBkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogZC5zdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNvcnRpbmcgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGQub3JkZXIgJiYgZC5vcmRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckNvbHVtbiA9IGQuY29sdW1uc1tkLm9yZGVyWzBdLmNvbHVtbl07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JkZXJDb2x1bW4gJiYgb3JkZXJDb2x1bW4ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3REYXRhLm9yZGVyX2J5ID0gb3JkZXJDb2x1bW4ubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGF0YS5vcmRlcl9kaXJlY3Rpb24gPSBkLm9yZGVyWzBdLmRpci50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdERhdGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBuZXcgcGFnaW5hdGlvbiBmb3JtYXQgZnJvbSBFbXBsb3llZXMgQVBJXG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zOiB7ZGF0YToge2RhdGE6IFsuLi5dLCByZWNvcmRzVG90YWw6IG4sIHJlY29yZHNGaWx0ZXJlZDogbn19XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhLCByZWNvcmRzVG90YWwsIHJlY29yZHNGaWx0ZXJlZDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChqc29uLmRhdGEgJiYganNvbi5kYXRhLmRhdGEgJiYgQXJyYXkuaXNBcnJheShqc29uLmRhdGEuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5ldyBwYWdpbmF0aW9uIGZvcm1hdFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGpzb24uZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3Jkc1RvdGFsID0ganNvbi5kYXRhLnJlY29yZHNUb3RhbCB8fCBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZHNGaWx0ZXJlZCA9IGpzb24uZGF0YS5yZWNvcmRzRmlsdGVyZWQgfHwgcmVjb3Jkc1RvdGFsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gb2xkIGZvcm1hdCBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGpzb24uZGF0YSB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZHNUb3RhbCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3Jkc0ZpbHRlcmVkID0gZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBEYXRhVGFibGVzIHBhZ2luYXRpb24gaW5mbyBvbiB0aGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIGpzb24uZHJhdyA9IGV4dGVuc2lvbnNJbmRleC5kcmF3Q291bnRlcjtcbiAgICAgICAgICAgICAgICAgICAganNvbi5yZWNvcmRzVG90YWwgPSByZWNvcmRzVG90YWw7XG4gICAgICAgICAgICAgICAgICAgIGpzb24ucmVjb3Jkc0ZpbHRlcmVkID0gcmVjb3Jkc0ZpbHRlcmVkO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGp1c3QgdGhlIGRhdGEgYXJyYXkgZm9yIERhdGFUYWJsZXMgdG8gcHJvY2Vzc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbih4aHIsIHRleHRTdGF0dXMsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1cHByZXNzIHRoZSBkZWZhdWx0IGVycm9yIGFsZXJ0XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEYXRhVGFibGUgcmVxdWVzdCBmYWlsZWQsIHdpbGwgcmV0cnkgaW4gMyBzZWNvbmRzJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgcmV0cnkgdGltZW91dFxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uc0luZGV4LnJldHJ5VGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdXAgcmV0cnkgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5yZXRyeVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5hamF4LnJlbG9hZChudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBQcmV2ZW50IGRlZmF1bHQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgLy8gc3RhdGVTYXZlOiB0cnVlLFxuICAgICAgICAgICAgc0RvbTogJ3J0aXAnLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBwYWdlTGVuZ3RoLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICAvLyBzY3JvbGxlcjogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiB7XG4gICAgICAgICAgICAgICAgLi4uU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgICAgIGVtcHR5VGFibGU6ICcgJywgIC8vIEVtcHR5IHN0cmluZyB0byBoaWRlIGRlZmF1bHQgbWVzc2FnZVxuICAgICAgICAgICAgICAgIHplcm9SZWNvcmRzOiAnICcgLy8gRW1wdHkgc3RyaW5nIHRvIGhpZGUgZGVmYXVsdCBtZXNzYWdlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBFeHRlbnNpb25zIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXBsYXRlUm93ICA9ICAkKCcuZXh0ZW5zaW9uLXJvdy10cGwnKS5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYXZhdGFyID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hdmF0YXInKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmF0dHIoJ3NyYycsIGRhdGEuYXZhdGFyKTtcbiAgICAgICAgICAgICAgICAkYXZhdGFyLmFmdGVyKGRhdGEudXNlcl91c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgJHRlbXBsYXRlUm93LmZpbmQoJy5udW1iZXInKS50ZXh0KGRhdGEubnVtYmVyKTtcbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLm1vYmlsZSBpbnB1dCcpLmF0dHIoJ3ZhbHVlJywgZGF0YS5tb2JpbGUpO1xuICAgICAgICAgICAgICAgICR0ZW1wbGF0ZVJvdy5maW5kKCcuZW1haWwnKS50ZXh0KGRhdGEudXNlcl9lbWFpbCk7XG5cbiAgICAgICAgICAgICAgICAkdGVtcGxhdGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucmVtb3ZlQ2xhc3MoJ3NtYWxsJykuYWRkQ2xhc3MoJ3RpbnknKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0ICRlZGl0QnV0dG9uID0gJHRlbXBsYXRlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucyAuYnV0dG9uLmVkaXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVkaXRCdXR0b24gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICRlZGl0QnV0dG9uLmF0dHIoJ2hyZWYnLGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtkYXRhLmlkfWApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ1dHRvbiA9ICR0ZW1wbGF0ZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGNsaXBib2FyZEJ1dHRvbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgJGNsaXBib2FyZEJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJywgZGF0YS5udW1iZXIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXZhbHVlJywgZGF0YS5udW1iZXIpO1xuICAgICAgICAgICAgICAgICQocm93KS5hdHRyKCdpZCcsIGRhdGEubnVtYmVyKTsgLy8gVXNlIGV4dGVuc2lvbiBudW1iZXIgYXMgSUQgZm9yIHN0YXR1cyBtb25pdG9yXG4gICAgICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJywgZGF0YS5pZCk7IC8vIFByZXNlcnZlIGRhdGFiYXNlIElEIGFzIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgJChyb3cpLmFkZENsYXNzKCdleHRlbnNpb24tcm93Jyk7IC8vIEFkZCBjbGFzcyBmb3Igc3RhdHVzIG1vbml0b3JcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBkaXNhYmxlZCBjbGFzcyBpZiBleHRlbnNpb24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAkKHJvdykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXMgaW1tZWRpYXRlbHkgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5zdGF0dXNDYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZWRTdGF0dXMgPSBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3Iuc3RhdHVzQ2FjaGVbZGF0YS5udW1iZXJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2FjaGVkU3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTdGF0dXMgaXMgYXZhaWxhYmxlIGluIGNhY2hlLCBhcHBseSBpdCBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ29sb3IgPSBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IuZ2V0Q29sb3JGb3JTdGF0dXMoY2FjaGVkU3RhdHVzLnN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICQocm93KS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRXh0ZW5zaW9uICR7ZGF0YS5udW1iZXJ9OiAke2NhY2hlZFN0YXR1cy5zdGF0dXN9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkLmVhY2goJCgndGQnLCAkdGVtcGxhdGVSb3cpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcShpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKCQodmFsdWUpLmh0bWwoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygkKHZhbHVlKS5hdHRyKCdjbGFzcycpKVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEcmF3IGV2ZW50IC0gZmlyZWQgb25jZSB0aGUgdGFibGUgaGFzIGNvbXBsZXRlZCBhIGRyYXcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRyYXdDYWxsYmFjayhzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGlucHV0IG1hc2sgZm9yIG1vYmlsZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5pbml0aWFsaXplSW5wdXRtYXNrKCQoJ2lucHV0Lm1vYmlsZS1udW1iZXItaW5wdXQnKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFibGUgaXMgZW1wdHkgYW5kIHNob3cgYXBwcm9wcmlhdGUgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFwaSA9IG5ldyAkLmZuLmRhdGFUYWJsZS5BcGkoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VJbmZvID0gYXBpLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1JlY29yZHMgPSBwYWdlSW5mby5yZWNvcmRzRGlzcGxheSA+IDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSBhcGkuc2VhcmNoKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNSZWNvcmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBkdWUgdG8gc2VhcmNoIGZpbHRlciBvciB0cnVseSBlbXB0eSBkYXRhYmFzZVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VhcmNoVmFsdWUgJiYgc2VhcmNoVmFsdWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBcIk5vdGhpbmcgZm91bmRcIiBtZXNzYWdlIGZvciBzZWFyY2ggcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LnNob3dOb1NlYXJjaFJlc3VsdHNNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IFwiQWRkIGZpcnN0IGVtcGxveWVlXCIgcGxhY2Vob2xkZXIgZm9yIGVtcHR5IGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy1wbGFjZWhvbGRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXRhYmxlJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9ucy10YWJsZS1jb250YWluZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXguaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGNhY2hlZCBzdGF0dXNlcyB0byBuZXdseSByZW5kZXJlZCByb3dzXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBET00gY2FjaGUgZm9yIG5ldyByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IucmVmcmVzaENhY2hlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBjYWNoZWQgc3RhdHVzZXMgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvci5hcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXNlcyBmb3IgYW55IG5ldyBleHRlbnNpb25zIG5vdCBpbiBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLnJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3IHJlY29yZHMgKGxlc3MgdGhhbiBwYWdlIGxlbmd0aClcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zSW5kZXgudG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkocGFnZUluZm8pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB1cCBwb3B1cHMuXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIERpc2FibGUgRGF0YVRhYmxlcyBlcnJvciBhbGVydHMgY29tcGxldGVseVxuICAgICAgICAgICAgZm5Jbml0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlIERhdGFUYWJsZXMgZXJyb3IgZXZlbnQgaGFuZGxlclxuICAgICAgICAgICAgICAgICQuZm4uZGF0YVRhYmxlLmV4dC5lcnJNb2RlID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHNlbGVjdCBpbnB1dCB2YWx1ZSB0byB0aGUgc2F2ZWQgdmFsdWUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzYXZlZFBhZ2VMZW5ndGgpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kcGFnZUxlbmd0aFNlbGVjdG9yLmRyb3Bkb3duKCdzZXQgdmFsdWUnLHNhdmVkUGFnZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5EYXRhVGFibGUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYm91bmNlIHRpbWVyIHZhcmlhYmxlXG4gICAgICAgIGxldCBzZWFyY2hEZWJvdW5jZVRpbWVyID0gbnVsbDtcblxuICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC5vbigna2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZXIgaWYgdGhlIHVzZXIgaXMgc3RpbGwgdHlwaW5nXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VhcmNoRGVib3VuY2VUaW1lcik7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciBmb3IgZGVsYXllZCBleGVjdXRpb25cbiAgICAgICAgICAgIHNlYXJjaERlYm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZXh0ZW5zaW9uc0luZGV4LiRnbG9iYWxTZWFyY2gudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgc2VhcmNoIGlmIGlucHV0IGlzIHZhbGlkIChFbnRlciwgQmFja3NwYWNlLCBvciBtb3JlIHRoYW4gMiBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzIHx8IGUua2V5Q29kZSA9PT0gOCB8fCB0ZXh0Lmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5hcHBseUZpbHRlcih0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWxheSBiZWZvcmUgZXhlY3V0aW5nIHRoZSBzZWFyY2hcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgc2F2ZWQgc2VhcmNoIHBocmFzZSBmcm9tIERhdGFUYWJsZXMgc3RhdGVcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnN0YXRlLmxvYWRlZCgpO1xuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2VhcmNoKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc3RhdGUuc2VhcmNoLnNlYXJjaCk7IC8vIFNldCB0aGUgc2VhcmNoIGZpZWxkIHdpdGggdGhlIHNhdmVkIHZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mICdzZWFyY2gnIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gZXh0ZW5zaW9uc0luZGV4LmdldFF1ZXJ5UGFyYW0oJ3NlYXJjaCcpO1xuXG4gICAgICAgIC8vIFNldHMgdGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgdmFsdWUgYW5kIGFwcGxpZXMgdGhlIGZpbHRlciBpZiBhIHNlYXJjaCB2YWx1ZSBpcyBwcm92aWRlZC5cbiAgICAgICAgaWYgKHNlYXJjaFZhbHVlKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zSW5kZXguJGdsb2JhbFNlYXJjaC52YWwoc2VhcmNoVmFsdWUpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmFwcGx5RmlsdGVyKHNlYXJjaFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gaW5kZXggc3RhdHVzIG1vbml0b3IgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgYWZ0ZXIgdGFibGUgbG9hZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHZhbHVlIG9mIGEgc3BlY2lmaWVkIHF1ZXJ5IHBhcmFtZXRlciBmcm9tIHRoZSBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgbmFtZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVyIHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ3xudWxsfSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlciwgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gICAgICovXG4gICAgZ2V0UXVlcnlQYXJhbShwYXJhbSkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4gdXJsUGFyYW1zLmdldChwYXJhbSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiByb3dzIHRoYXQgY2FuIGZpdCBvbiBhIHBhZ2UgYmFzZWQgb24gdGhlIGN1cnJlbnQgd2luZG93IGhlaWdodC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBleHRlbnNpb25zSW5kZXguJGV4dGVuc2lvbnNMaXN0LmZpbmQoJ3RyJykuZmlyc3QoKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gMzkwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgNSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGRlbGV0aW5nIGEgcmVjb3JkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGhlIGRhdGF0YWJsZSB0byByZWZsZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5kYXRhVGFibGUuYWpheC5yZWxvYWQobnVsbCwgZmFsc2UpO1xuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGRhdGEgY2hhbmdlIGlmIGl0IGV4aXN0cy5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBkZWxldGlvbiB3YXMgbm90IHN1Y2Nlc3NmdWwuXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IsIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVFeHRlbnNpb24pO1xuICAgICAgICB9XG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGNldCBleHRlbnNpb24gc2VjcmV0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRTZWNyZXQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnV0dG9uID0gZXh0ZW5zaW9uc0luZGV4LiRleHRlbnNpb25zTGlzdC5maW5kKGBhLmNsaXBib2FyZFtkYXRhLXZhbHVlPSR7cmVzcG9uc2UuZGF0YS5udW1iZXJ9XWApO1xuICAgICAgICAgICAgZXh0ZW5zaW9uc0luZGV4LmNvcHlUb0NsaXBib2FyZChyZXNwb25zZS5kYXRhLnNlY3JldCk7XG4gICAgICAgICAgICAkY2xpcGJvYXJkQnV0dG9uLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRjbGlwYm9hcmRCdXR0b24ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgYW4gZXJyb3IgbWVzc2FnZSBpZiBnZXQgc2VjcmV0IHdhcyBub3Qgc3VjY2Vzc2Z1bC5cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcy5lcnJvciwgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0dldFNlY3JldCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnYS5jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgaW5wdXQgbWFza3MgZm9yIHZpc3VhbGl6aW5nIGZvcm1hdHRlZCBudW1iZXJzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBUaGUgalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgdG8gaW5pdGlhbGl6ZSB0aGUgaW5wdXQgbWFzayBvbi5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uc0luZGV4Lm1hc2tMaXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBQcmVwYXJlcyB0aGUgdGFibGUgZm9yIHNvcnRcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCA9ICQubWFza3NTb3J0KElucHV0TWFza1BhdHRlcm5zLCBbJyMnXSwgL1swLTldfCMvLCAnbWFzaycpO1xuICAgICAgICB9XG4gICAgICAgICRlbC5pbnB1dG1hc2tzKHtcbiAgICAgICAgICAgIGlucHV0bWFzazoge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICcjJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yOiAnWzAtOV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXRjaDogL1swLTldLyxcbiAgICAgICAgICAgIHJlcGxhY2U6ICc5JyxcbiAgICAgICAgICAgIGxpc3Q6IGV4dGVuc2lvbnNJbmRleC5tYXNrTGlzdCxcbiAgICAgICAgICAgIGxpc3RLZXk6ICdtYXNrJyxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBmaWx0ZXIgdG8gdGhlIGRhdGEgdGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgZmlsdGVyIHRleHQuXG4gICAgICovXG4gICAgYXBwbHlGaWx0ZXIodGV4dCkge1xuICAgICAgICBleHRlbnNpb25zSW5kZXguZGF0YVRhYmxlLnNlYXJjaCh0ZXh0KS5kcmF3KCk7XG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC4kZ2xvYmFsU2VhcmNoLmNsb3Nlc3QoJ2RpdicpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgc2hvd05vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3Rpbmcgbm8tcmVzdWx0cyBtZXNzYWdlXG4gICAgICAgIGV4dGVuc2lvbnNJbmRleC5oaWRlTm9TZWFyY2hSZXN1bHRzTWVzc2FnZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IG5vIHJlc3VsdHMgbWVzc2FnZVxuICAgICAgICBjb25zdCBub1Jlc3VsdHNIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBpZD1cIm5vLXNlYXJjaC1yZXN1bHRzXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAyZW07XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNlYXJjaCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vU2VhcmNoUmVzdWx0c308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RyeURpZmZlcmVudEtleXdvcmRzfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgJCgnI2V4dGVuc2lvbnMtdGFibGUtY29udGFpbmVyJykuYWZ0ZXIobm9SZXN1bHRzSHRtbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIFwiTm8gc2VhcmNoIHJlc3VsdHMgZm91bmRcIiBtZXNzYWdlXG4gICAgICovXG4gICAgaGlkZU5vU2VhcmNoUmVzdWx0c01lc3NhZ2UoKSB7XG4gICAgICAgICQoJyNuby1zZWFyY2gtcmVzdWx0cycpLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHBhZ2luYXRpb24gdmlzaWJpbGl0eSBiYXNlZCBvbiBudW1iZXIgb2YgcmVjb3Jkc1xuICAgICAqIEhpZGVzIHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgZmV3ZXIgcmVjb3JkcyB0aGFuIHRoZSBwYWdlIGxlbmd0aFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYWdlSW5mbyAtIERhdGFUYWJsZXMgcGFnZSBpbmZvIG9iamVjdFxuICAgICAqL1xuICAgIHRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5KHBhZ2VJbmZvKSB7XG4gICAgICAgIGNvbnN0IHBhZ2luYXRpb25XcmFwcGVyID0gJCgnI2V4dGVuc2lvbnMtdGFibGVfcGFnaW5hdGUnKTtcbiAgICAgICAgY29uc3QgcGFnaW5hdGlvbkluZm8gPSAkKCcjZXh0ZW5zaW9ucy10YWJsZV9pbmZvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gaWYgdG90YWwgcmVjb3JkcyBmaXQgb24gb25lIHBhZ2VcbiAgICAgICAgaWYgKHBhZ2VJbmZvLnJlY29yZHNEaXNwbGF5IDw9IHBhZ2VJbmZvLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuaGlkZSgpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnaW5hdGlvbldyYXBwZXIuc2hvdygpO1xuICAgICAgICAgICAgcGFnaW5hdGlvbkluZm8uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgdGV4dCBwYXNzZWQgYXMgcGFyYW0gdG8gdGhlIHN5c3RlbSBjbGlwYm9hcmRcbiAgICAgKiBDaGVjayBpZiB1c2luZyBIVFRQUyBhbmQgbmF2aWdhdG9yLmNsaXBib2FyZCBpcyBhdmFpbGFibGVcbiAgICAgKiBUaGVuIHVzZXMgc3RhbmRhcmQgY2xpcGJvYXJkIEFQSSwgb3RoZXJ3aXNlIHVzZXMgZmFsbGJhY2tcbiAgICAgKi9cbiAgICBjb3B5VG9DbGlwYm9hcmQoY29udGVudCkge1xuICAgICAgICBpZiAod2luZG93LmlzU2VjdXJlQ29udGV4dCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbnNJbmRleC51bnNlY3VyZWRDb3B5VG9DbGlwYm9hcmQoY29udGVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFB1dCB0ZXh0IHZhcmlhYmxlIGludG8gY2xpcGJvYXJkIGZvciB1bnNlY3VyZWQgY29ubmVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudCAtIFRoZSB0ZXh0IHZhbHVlLlxuICAgICAqL1xuICAgIHVuc2VjdXJlZENvcHlUb0NsaXBib2FyZChjb250ZW50KSB7XG4gICAgICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgICAgICB0ZXh0QXJlYS52YWx1ZT1jb250ZW50O1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRleHRBcmVhKTtcbiAgICAgICAgdGV4dEFyZWEuZm9jdXMoKTt0ZXh0QXJlYS5zZWxlY3QoKTtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKVxuICAgICAgICB9IGNhdGNoKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVW5hYmxlIHRvIGNvcHkgdG8gY2xpcGJvYXJkJywgZXJyKVxuICAgICAgICB9XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgZXh0ZW5zaW9uIHN0YXR1cyBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNpbXBsaWZpZWQgbW9kZSBmb3IgaW5kZXggcGFnZSAtIHBhc3Mgb3B0aW9ucyBhcyBmaXJzdCBwYXJhbSwgY2FsbGJhY2sgYXMgc2Vjb25kXG4gICAgICAgICAgICBFeHRlbnNpb25zQVBJLmdldFN0YXR1c2VzKHsgc2ltcGxpZmllZDogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSB0cmlnZ2VyIHN0YXR1cyB1cGRhdGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZGF0YSAmJiB0eXBlb2YgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IudXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEVtcGxveWVlcyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=